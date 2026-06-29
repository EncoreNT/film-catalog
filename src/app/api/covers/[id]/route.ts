import { NextRequest, NextResponse } from "next/server";
import { readFile, stat } from "fs/promises";
import path from "path";
import { prisma } from "@/lib/prisma";
import { dataPath } from "@/lib/data-path";
import {
  isErrorResponse,
  jsonError,
  parseRouteId,
  type RouteContext,
} from "@/lib/api-utils";
import { COVER_MIME_BY_EXT, isCoverImageExtension } from "@/lib/cover-formats";

export async function GET(request: NextRequest, context: RouteContext) {
  const movieId = await parseRouteId(context.params);
  if (isErrorResponse(movieId)) return movieId;

  const movie = await prisma.movie.findUnique({
    where: { id: movieId },
    select: { coverPath: true, updatedAt: true },
  });
  if (!movie?.coverPath) {
    return jsonError("Обложка не найдена", 404);
  }

  const filePath = dataPath(movie.coverPath);
  const ext = path.extname(filePath).toLowerCase();
  if (!isCoverImageExtension(ext)) {
    await prisma.movie
      .update({ where: { id: movieId }, data: { coverPath: null } })
      .catch(() => {});
    return jsonError("Файл обложки имеет неподдерживаемый формат", 404);
  }
  const contentType = COVER_MIME_BY_EXT[ext] ?? "application/octet-stream";
  const etag = `"cover-${movieId}-${movie.updatedAt.getTime()}"`;

  if (request.headers.get("if-none-match") === etag) {
    return new NextResponse(null, {
      status: 304,
      headers: {
        ETag: etag,
        "Cache-Control": "public, max-age=86400, must-revalidate",
      },
    });
  }

  try {
    const [buffer, fileStat] = await Promise.all([
      readFile(filePath),
      stat(filePath),
    ]);

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400, must-revalidate",
        ETag: etag,
        "Last-Modified": fileStat.mtime.toUTCString(),
      },
    });
  } catch {
    // DB can outlive files on disk (redeploy, missing volume). Drop stale path
    // so the UI stops requesting a cover that no longer exists.
    await prisma.movie
      .update({ where: { id: movieId }, data: { coverPath: null } })
      .catch(() => {});
    return jsonError("Файл обложки отсутствует", 404);
  }
}
