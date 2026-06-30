import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  buildMovieOrder,
  buildMovieWhere,
  parseListQuery,
} from "@/lib/movie-query";
import { movieCreateSchema } from "@/lib/validators";
import { MovieStatus } from "@/generated/prisma/client";
import { probeMediaFile } from "@/lib/ffprobe";
import { maybeExtractCover } from "@/lib/cover-storage";
import { movieInclude } from "@/lib/movie-include";
import { upsertGenresByNames } from "@/lib/genres";
import { resolveMovieSlug } from "@/lib/movie-slug";
import { loadMovieFileMeta } from "@/lib/load-movie-file-meta";

export async function GET(request: NextRequest) {
  const query = parseListQuery(request.nextUrl.searchParams);
  const where = buildMovieWhere(query);
  const orderBy = buildMovieOrder(query);
  const page = query.page ?? 1;
  const limit = query.limit ?? 48;
  const skip = (page - 1) * limit;

  const [movies, total] = await Promise.all([
    prisma.movie.findMany({ where, orderBy, skip, take: limit, include: movieInclude }),
    prisma.movie.count({ where }),
  ]);

  return NextResponse.json({
    movies,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const data = movieCreateSchema.parse(body);

    if (data.probeOnly) {
      if (!data.filePath?.trim()) {
        return NextResponse.json(
          { error: "Укажите путь к файлу для автозаполнения" },
          { status: 400 },
        );
      }
      try {
        const { assertMovieFileReadable } = await loadMovieFileMeta();
        await assertMovieFileReadable(data.filePath);
      } catch {
        return NextResponse.json(
          { error: "Файл не найден по указанному пути" },
          { status: 404 },
        );
      }
      const probe = await probeMediaFile(data.filePath);
      const { readMovieFileMeta } = await loadMovieFileMeta();
      const meta = await readMovieFileMeta(data.filePath);
      return NextResponse.json({
        durationSeconds: probe.durationSeconds,
        video: probe.video,
        audio: probe.audio,
        subtitles: probe.subtitles,
        fileSize: meta.fileSize,
        fileMtime: meta.fileMtime.toISOString(),
        fileHash: meta.fileHash,
      });
    }

    let video = (data.videoTrack as Record<string, unknown> | null) ?? null;
    let audio = (data.audioTracks as Record<string, unknown>[]) ?? [];
    let subtitles = (data.subtitleTracks as Record<string, unknown>[]) ?? [];
    let durationSeconds = data.durationSeconds ?? null;

    const shouldProbe = !!data.filePath && !data.skipProbe;
    if (shouldProbe) {
      try {
        const probe = await probeMediaFile(data.filePath as string);
        if (probe.durationSeconds != null) durationSeconds = probe.durationSeconds;
        if (probe.video) video = probe.video as unknown as typeof video;
        if (probe.audio.length) audio = probe.audio as unknown as typeof audio;
        if (probe.subtitles.length)
          subtitles = probe.subtitles as unknown as typeof subtitles;
      } catch {
        // ffprobe failed — keep manually provided / empty values
      }
    }

    const genreRows = data.genres?.length
      ? await upsertGenresByNames(data.genres)
      : [];

    let fileSize: number | null = null;
    let fileMtime: Date | null = null;
    let fileHash: string | null = null;
    const trimmedPath = data.filePath?.trim() || null;
    if (trimmedPath) {
      try {
        const { readMovieFileMeta } = await loadMovieFileMeta();
        const meta = await readMovieFileMeta(trimmedPath);
        fileSize = meta.fileSize;
        fileMtime = meta.fileMtime;
        fileHash = meta.fileHash;
      } catch {
        return NextResponse.json(
          { error: "Файл не найден по указанному пути" },
          { status: 400 },
        );
      }
    }

    const slug = await resolveMovieSlug(prisma, data.title);

    const movie = await prisma.movie.create({
      data: {
        slug,
        title: data.title,
        year: data.year ?? null,
        description: data.description ?? null,
        durationSeconds,
        filePath: trimmedPath,
        fileSize,
        fileMtime,
        fileHash,
        storageId: data.storageId ?? null,
        releaseType: data.releaseType ?? null,
        status: data.status ?? MovieStatus.CATALOG,
        genres: genreRows.length
          ? { connect: genreRows.map((g) => ({ id: g.id })) }
          : undefined,
        videoTrack: video
          ? { create: { streamIndex: 0, ...(video as Record<string, unknown>) } }
          : undefined,
        audioTracks: audio.length
          ? {
              create: audio.map((t, i) => ({
                streamIndex: (t.streamIndex as number) ?? i,
                codec: (t.codec as string | null) ?? null,
                profile: (t.profile as string | null) ?? null,
                channels: (t.channels as number | null) ?? null,
                channelLayout: (t.channelLayout as string | null) ?? null,
                bitrate: (t.bitrate as number | null) ?? null,
                language: (t.language as string | null) ?? null,
                translationType: (t.translationType as string | null) ?? null,
                title: (t.title as string | null) ?? null,
                isDefault: (t.isDefault as boolean) ?? false,
              })),
            }
          : undefined,
        subtitleTracks: subtitles.length
          ? {
              create: subtitles.map((t, i) => ({
                streamIndex: (t.streamIndex as number) ?? i,
                codec: (t.codec as string | null) ?? null,
                codecLabel: (t.codecLabel as string | null) ?? null,
                language: (t.language as string | null) ?? null,
                title: (t.title as string | null) ?? null,
                isDefault: (t.isDefault as boolean) ?? false,
                forced: (t.forced as boolean) ?? false,
              })),
            }
          : undefined,
      },
      include: movieInclude,
    });

    // When the caller skipped probing (e.g. the Add form, which autofills
    // from a probeOnly call), still try to pull an embedded poster out of the
    // file. Best-effort: failures never block movie creation.
    if (trimmedPath && !movie.coverPath) {
      try {
        await maybeExtractCover(movie.id, trimmedPath, false);
      } catch {
        // ignore — cover extraction is non-fatal
      }
    }

    return NextResponse.json(movie, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Create failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function HEAD(request: NextRequest) {
  const filePath = request.nextUrl.searchParams.get("path");
  if (!filePath) {
    return new NextResponse(null, { status: 400 });
  }
  try {
    const { assertMovieFileReadable } = await loadMovieFileMeta();
    await assertMovieFileReadable(filePath);
    return new NextResponse(null, { status: 200 });
  } catch {
    return new NextResponse(null, { status: 404 });
  }
}
