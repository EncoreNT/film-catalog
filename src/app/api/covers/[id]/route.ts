import { NextRequest, NextResponse } from "next/server";
import { readFile, stat } from "fs/promises";
import path from "path";
import { prisma } from "@/lib/prisma";
import {
  isErrorResponse,
  jsonError,
  parseRouteId,
  type RouteContext,
} from "@/lib/api-utils";

const MIME: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".avif": "image/avif",
};

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

  const filePath = path.join(process.cwd(), "data", movie.coverPath);
  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME[ext] ?? "application/octet-stream";
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
    return jsonError("Файл обложки отсутствует", 404);
  }
}
