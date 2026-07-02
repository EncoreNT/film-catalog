import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  buildMovieListWhere,
  buildMovieOrder,
  parseListQuery,
} from "@/lib/movie-query";
import { movieCreateSchema } from "@/lib/validators";
import { MovieStatus } from "@/generated/prisma/client";
import { maybeExtractCover } from "@/lib/cover-storage";
import { movieInclude } from "@/lib/movie-include";
import { syncMovieGenres } from "@/lib/genres";
import { resolveMovieSlug } from "@/lib/movie-slug";
import { computeMatchKey } from "@/lib/movie-match-key";
import {
  createReleaseWithTracks,
  extractReleaseInputFromMovieCreate,
  readReleaseFileMeta,
  resolveReleaseProbeData,
} from "@/lib/release-api";
import { loadMovieFileMeta } from "@/lib/load-movie-file-meta";
import { probeMediaFile } from "@/lib/ffprobe";

export async function GET(request: NextRequest) {
  const query = parseListQuery(request.nextUrl.searchParams);
  const where = await buildMovieListWhere(query);
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
    const releaseInput = extractReleaseInputFromMovieCreate(data);

    if (data.probeOnly) {
      const filePath = releaseInput?.filePath ?? data.filePath;
      if (!filePath?.trim()) {
        return NextResponse.json(
          { error: "Укажите путь к файлу для автозаполнения" },
          { status: 400 },
        );
      }
      try {
        const { assertMovieFileReadable } = await loadMovieFileMeta();
        await assertMovieFileReadable(filePath);
      } catch {
        return NextResponse.json(
          { error: "Файл не найден по указанному пути" },
          { status: 404 },
        );
      }
      const probe = await probeMediaFile(filePath);
      const meta = await readReleaseFileMeta(filePath);
      return NextResponse.json({
        durationSeconds: probe.durationSeconds,
        video: probe.video,
        audio: probe.audio,
        subtitles: probe.subtitles,
        fileSize: meta.fileSize,
        fileMtime: meta.fileMtime?.toISOString(),
        fileHash: meta.fileHash,
      });
    }

    const genreNames = data.genres ?? [];
    const slug = await resolveMovieSlug(prisma, data.title);
    const matchKey = computeMatchKey(data.title, data.year ?? null);

    const movie = await prisma.$transaction(async (tx) => {
      const created = await tx.movie.create({
        data: {
          slug,
          title: data.title,
          year: data.year ?? null,
          description: data.description ?? null,
          matchKey,
          status: data.status ?? MovieStatus.CATALOG,
        },
      });

      if (releaseInput) {
        await createReleaseWithTracks(tx, created.id, releaseInput);
      }

      if (genreNames.length > 0) {
        await syncMovieGenres(tx, created.id, genreNames);
      }

      return tx.movie.findUnique({
        where: { id: created.id },
        include: movieInclude,
      });
    });

    const trimmedPath = releaseInput?.filePath?.trim();
    if (trimmedPath && movie && !movie.coverPath) {
      try {
        await maybeExtractCover(movie.id, trimmedPath, false);
      } catch {
        // non-fatal
      }
    }

    const result =
      movie ??
      (await prisma.movie.findUnique({
        where: { slug },
        include: movieInclude,
      }));

    return NextResponse.json(result, { status: 201 });
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
