import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { movieUpdateSchema } from "@/lib/validators";
import { movieInclude } from "@/lib/movie-include";
import { syncMovieGenres } from "@/lib/genres";
import { syncMovieTracks } from "@/lib/movie-tracks";
import { resolveMovieSlug } from "@/lib/movie-slug";
import {
  isErrorResponse,
  jsonError,
  parseRouteId,
  type RouteContext,
} from "@/lib/api-utils";

export async function PATCH(request: NextRequest, context: RouteContext) {
  const movieId = await parseRouteId(context.params);
  if (isErrorResponse(movieId)) return movieId;

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
      fileSize,
      fileMtime,
      fileHash,
      storageId,
      version,
      ...movieData
    } = data;

    const genreNames = genres ?? null;

    let nextFileSize: number | null | undefined;
    let nextFileMtime: Date | null | undefined;
    let nextFileHash: string | null | undefined;

    if (filePath !== undefined) {
      const trimmed = filePath?.trim() || null;
      if (!trimmed) {
        nextFileSize = null;
        nextFileMtime = null;
        nextFileHash = null;
      } else if (
        fileSize !== undefined ||
        fileMtime !== undefined ||
        fileHash !== undefined
      ) {
        nextFileSize = fileSize ?? null;
        nextFileMtime = fileMtime ? new Date(fileMtime) : null;
        nextFileHash = fileHash ?? null;
      }
    } else if (
      fileSize !== undefined ||
      fileMtime !== undefined ||
      fileHash !== undefined
    ) {
      nextFileSize = fileSize ?? null;
      nextFileMtime = fileMtime ? new Date(fileMtime) : null;
      nextFileHash = fileHash ?? null;
    }

    const movie = await prisma.$transaction(async (tx) => {
      const slug =
        movieData.title !== undefined
          ? await resolveMovieSlug(tx, movieData.title, movieId)
          : undefined;

      await tx.movie.update({
        where: { id: movieId },
        data: {
          ...movieData,
          ...(version != null ? { version } : {}),
          slug,
          filePath:
            filePath === undefined ? undefined : filePath ? filePath : null,
          fileSize: nextFileSize,
          fileMtime: nextFileMtime,
          fileHash: nextFileHash,
          ...(storageId === undefined
            ? {}
            : storageId != null
              ? { storage: { connect: { id: storageId } } }
              : { storage: { disconnect: true } }),
          watchedAt:
            watchedAt === undefined
              ? undefined
              : watchedAt
                ? new Date(watchedAt)
                : null,
        },
      });

      if (genreNames !== null) {
        await syncMovieGenres(tx, movieId, genreNames);
      }

      if (
        videoTrack !== undefined ||
        audioTracks !== undefined ||
        subtitleTracks !== undefined
      ) {
        await syncMovieTracks(tx, movieId, {
          videoTrack: videoTrack ?? undefined,
          audioTracks,
          subtitleTracks,
        });
      }

      return tx.movie.findUnique({
        where: { id: movieId },
        include: movieInclude,
      });
    });

    return NextResponse.json(movie);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Не удалось обновить фильм";
    return jsonError(message, 400);
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  const movieId = await parseRouteId(context.params);
  if (isErrorResponse(movieId)) return movieId;

  await prisma.movie.delete({ where: { id: movieId } });
  return NextResponse.json({ ok: true });
}
