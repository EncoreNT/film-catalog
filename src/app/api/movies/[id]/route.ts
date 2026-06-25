import { NextRequest, NextResponse } from "next/server";
import { stat } from "fs/promises";
import { prisma } from "@/lib/prisma";
import { movieUpdateSchema } from "@/lib/validators";
import { movieInclude } from "@/lib/movie-include";
import { upsertGenresByNames } from "@/lib/genres";
import { computeFileHashPrefix } from "@/lib/file-hash";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const movieId = parseInt(id, 10);
  if (Number.isNaN(movieId)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const movie = await prisma.movie.findUnique({
    where: { id: movieId },
    include: movieInclude,
  });

  if (!movie) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(movie);
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const movieId = parseInt(id, 10);
  if (Number.isNaN(movieId)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  try {
    const body = await request.json();
    const data = movieUpdateSchema.parse(body);

    const {
      videoTrack,
      audioTracks,
      subtitleTracks,
      genres,
      watchedAt,
      filePath,
      storageId,
      ...movieData
    } = data;

    const genreRows = genres ? await upsertGenresByNames(genres) : null;

    let fileSize: number | null | undefined;
    let fileMtime: Date | null | undefined;
    let fileHash: string | null | undefined;

    if (filePath !== undefined) {
      const trimmed = filePath?.trim() || null;
      if (trimmed) {
        try {
          const fileStat = await stat(trimmed);
          fileSize = fileStat.size;
          fileMtime = fileStat.mtime;
          fileHash = await computeFileHashPrefix(trimmed);
        } catch {
          return NextResponse.json(
            { error: "Файл не найден по указанному пути" },
            { status: 400 },
          );
        }
      } else {
        fileSize = null;
        fileMtime = null;
        fileHash = null;
      }
    }

    await prisma.movie.update({
      where: { id: movieId },
      data: {
        ...movieData,
        filePath:
          filePath === undefined ? undefined : filePath ? filePath : null,
        fileSize,
        fileMtime,
        fileHash,
        storageId:
          storageId === undefined ? undefined : storageId ? storageId : null,
        watchedAt:
          watchedAt === undefined
            ? undefined
            : watchedAt
              ? new Date(watchedAt)
              : null,
        genres:
          genreRows === null
            ? undefined
            : { set: genreRows.map((g) => ({ id: g.id })) },
      },
    });

    if (videoTrack) {
      await prisma.videoTrack.upsert({
        where: { movieId },
        create: { movieId, streamIndex: 0, ...videoTrack },
        update: videoTrack,
      });
    }

    if (audioTracks) {
      await prisma.audioTrack.deleteMany({ where: { movieId } });
      if (audioTracks.length > 0) {
        await prisma.audioTrack.createMany({
          data: audioTracks.map((t) => ({
            movieId,
            streamIndex: t.streamIndex,
            codec: t.codec ?? null,
            profile: t.profile ?? null,
            channels: t.channels ?? null,
            channelLayout: t.channelLayout ?? null,
            bitrate: t.bitrate ?? null,
            language: t.language ?? null,
            translationType: t.translationType ?? null,
            title: t.title ?? null,
            isDefault: t.isDefault ?? false,
          })),
        });
      }
    }

    if (subtitleTracks) {
      await prisma.subtitleTrack.deleteMany({ where: { movieId } });
      if (subtitleTracks.length > 0) {
        await prisma.subtitleTrack.createMany({
          data: subtitleTracks.map((t) => ({
            movieId,
            streamIndex: t.streamIndex,
            codec: t.codec ?? null,
            codecLabel: t.codecLabel ?? null,
            language: t.language ?? null,
            title: t.title ?? null,
            isDefault: t.isDefault ?? false,
            forced: t.forced ?? false,
          })),
        });
      }
    }

    const movie = await prisma.movie.findUnique({
      where: { id: movieId },
      include: movieInclude,
    });

    return NextResponse.json(movie);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Update failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const movieId = parseInt(id, 10);
  if (Number.isNaN(movieId)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  await prisma.movie.delete({ where: { id: movieId } });
  return NextResponse.json({ ok: true });
}
