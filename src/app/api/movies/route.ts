import { NextRequest, NextResponse } from "next/server";
import { movieCreateSchema } from "@/lib/api/validators";
import { createMovie, probeOnlyMovie } from "@/lib/movies/create-movie";
import { listMovies } from "@/lib/movies/list-movies";
import { loadMovieFileMeta } from "@/lib/releases/load-movie-file-meta";
import {
  mapDomainError,
  paginatedResponse,
  parseRequestBody,
  isErrorResponse,
} from "@/lib/api/api-utils";

export async function GET(request: NextRequest) {
  const { items, page, limit, total } = await listMovies(request);
  return paginatedResponse(items, { page, limit, total });
}

export async function POST(request: NextRequest) {
  const data = await parseRequestBody(request, movieCreateSchema);
  if (isErrorResponse(data)) return data;

  if (data.probeOnly) {
    try {
      const result = await probeOnlyMovie(data);
      return NextResponse.json(result);
    } catch (err) {
      return mapDomainError(err, "Не удалось проанализировать файл");
    }
  }

  try {
    const result = await createMovie(data);
    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    return mapDomainError(err, "Не удалось создать фильм");
  }
}

export async function HEAD(request: NextRequest) {
  const rawPath = request.nextUrl.searchParams.get("path");
  if (!rawPath) {
    return new NextResponse(null, { status: 400 });
  }
  const { normalizeFilePathInput } = await import("@/lib/shared/display-path");
  const filePath = normalizeFilePathInput(rawPath);
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
