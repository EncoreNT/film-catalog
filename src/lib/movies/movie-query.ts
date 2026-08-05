import type { Prisma } from "@/generated/prisma/client";
import { movieListQuerySchema } from "@/lib/api/validators";
import { buildCatalogAudioReleaseFilters } from "@/lib/catalog/catalog-audio-query";
import { normalizeSearchQuery } from "@/lib/movies/movie-match-key";
import { tvReadyReleaseWhere } from "@/lib/media/tv-ready";
import { archiveEliteTierWhere } from "@/lib/media/quality-predicates";
import { matchesCatalogRubyFilter } from "@/lib/media/tier-core";
import { prisma } from "@/lib/db/prisma";
import { movieHasMultipleReleaseVariants } from "@/lib/movies/multipart-duration";
import {
  DEFAULT_MOVIE_LIST_LIMIT,
  DEFAULT_MOVIE_LIST_ORDER,
  DEFAULT_MOVIE_LIST_SORT,
} from "@/lib/movies/movie-list-defaults";

export type { MovieWithTracks } from "@/lib/movies/movie-include";

export {
  DEFAULT_MOVIE_LIST_LIMIT,
  DEFAULT_MOVIE_LIST_ORDER,
  DEFAULT_MOVIE_LIST_SORT,
} from "@/lib/movies/movie-list-defaults";

export function parseListQuery(searchParams: URLSearchParams) {
  const raw = Object.fromEntries(searchParams.entries());
  return movieListQuerySchema.parse({
    ...raw,
    page: raw.page ?? "1",
    limit: raw.limit ?? String(DEFAULT_MOVIE_LIST_LIMIT),
    sort: raw.sort ?? DEFAULT_MOVIE_LIST_SORT,
    order: raw.order ?? DEFAULT_MOVIE_LIST_ORDER,
    status: raw.status ?? "CATALOG",
    watched: raw.watched ?? "all",
  });
}

function appendMovieAnd(
  where: Prisma.MovieWhereInput,
  clause: Prisma.MovieWhereInput,
): void {
  const existingAnd = Array.isArray(where.AND)
    ? where.AND
    : where.AND
      ? [where.AND]
      : [];
  where.AND = [...existingAnd, clause];
}

function isCatalogOnlyQuery(
  query: ReturnType<typeof parseListQuery>,
): boolean {
  const statuses = (query.status ?? "CATALOG").split(",").filter(Boolean);
  return statuses.length === 1 && statuses[0] === "CATALOG";
}

function catalogQualityFilterParams(
  query: ReturnType<typeof parseListQuery>,
): Parameters<typeof matchesCatalogRubyFilter>[0] {
  return {
    resolution: query.resolution ?? null,
    hdr: query.hdr ?? null,
    premiumAudio: query.premiumAudio ?? null,
  };
}

interface BuildMovieWhereContext {
  multiReleaseMovieIds?: number[];
}

function releaseSome(
  releaseWhere: Prisma.ReleaseWhereInput,
): Prisma.MovieWhereInput {
  return { releases: { some: releaseWhere } };
}

/** Movie ids with multiple release variants (excludes multi-part «one file per series»). */
export async function fetchMultiReleaseMovieIds(): Promise<number[]> {
  const movies = await prisma.movie.findMany({
    where: {
      releases: { some: {} },
    },
    select: {
      id: true,
      partCount: true,
      releases: { select: { moviePartId: true } },
    },
  });

  return movies
    .filter((movie) =>
      movieHasMultipleReleaseVariants(
        movie.releases.length,
        movie.partCount,
        movie.releases,
      ),
    )
    .map((movie) => movie.id);
}

export async function buildMovieListWhere(
  query: ReturnType<typeof parseListQuery>,
): Promise<Prisma.MovieWhereInput> {
  const multiReleaseMovieIds =
    query.multiRelease === "true" ? await fetchMultiReleaseMovieIds() : undefined;
  return buildMovieWhere(query, { multiReleaseMovieIds });
}

export function buildMovieWhere(
  query: ReturnType<typeof parseListQuery>,
  ctx: BuildMovieWhereContext = {},
): Prisma.MovieWhereInput {
  const where: Prisma.MovieWhereInput = {};

  if (query.status) {
    const statuses = query.status.split(",").filter(Boolean);
    if (statuses.length === 1) {
      where.status = statuses[0] as Prisma.EnumMovieStatusFilter["equals"];
    } else if (statuses.length > 1) {
      where.status = { in: statuses as ("DRAFT" | "CATALOG" | "EXCLUDED")[] };
    }
  }

  if (query.q) {
    const needle = normalizeSearchQuery(query.q);
    if (needle) {
      // title contains is case-sensitive in SQLite for Cyrillic; matchKey is JS-normalized.
      where.OR = [
        { matchKey: { contains: needle } },
        { matchKey: null, title: { contains: query.q.trim() } },
      ];
    }
  }

  if (query.multiRelease === "true") {
    const ids = ctx.multiReleaseMovieIds;
    if (!ids?.length) {
      where.id = -1;
    } else {
      where.id = { in: ids };
    }
  }

  if (query.minRating) {
    where.rating = { gte: query.minRating };
  }

  if (query.minDuration || query.maxDuration) {
    const minSec = query.minDuration ? query.minDuration * 60 : undefined;
    const maxSec = query.maxDuration ? query.maxDuration * 60 : undefined;
    Object.assign(
      where,
      releaseSome({
        durationSeconds: {
          ...(minSec != null ? { gte: minSec } : {}),
          ...(maxSec != null ? { lte: maxSec } : {}),
        },
      }),
    );
  }

  if (query.genre) {
    const genres = query.genre.split(",").filter(Boolean);
    if (genres.length === 1) {
      where.movieGenres = { some: { genre: { name: genres[0] } } };
    } else if (genres.length > 1) {
      where.movieGenres = { some: { genre: { name: { in: genres } } } };
    }
  }

  const hasWatchedRange = Boolean(query.watchedFrom || query.watchedTo);
  if (query.watched === "unwatched" && hasWatchedRange) {
    where.id = -1;
  } else if (query.watched === "watched") {
    where.watchedAt = {
      not: null,
      ...(query.watchedFrom ? { gte: new Date(query.watchedFrom) } : {}),
      ...(query.watchedTo ? { lte: new Date(query.watchedTo) } : {}),
    };
  } else if (query.watched === "unwatched") {
    where.watchedAt = null;
  } else if (hasWatchedRange) {
    where.watchedAt = {
      ...(query.watchedFrom ? { gte: new Date(query.watchedFrom) } : {}),
      ...(query.watchedTo ? { lte: new Date(query.watchedTo) } : {}),
    };
  }

  const releaseFilters: Prisma.ReleaseWhereInput[] = [];

  const rubyTierPreset =
    isCatalogOnlyQuery(query) &&
    matchesCatalogRubyFilter(catalogQualityFilterParams(query), true);

  if (rubyTierPreset) {
    appendMovieAnd(where, archiveEliteTierWhere);
  }

  if ((query.resolution || query.hdr) && !rubyTierPreset) {
    const resolutions = query.resolution?.split(",").filter(Boolean);
    const hdrValues = query.hdr?.split(",").filter(Boolean);
    const anyHdr = hdrValues?.includes("HDR_ANY");
    const explicitHdr = hdrValues?.filter((v) => v !== "HDR_ANY");
    releaseFilters.push({
      videoTrack: {
        ...(resolutions?.length
          ? { resolutionLabel: { in: resolutions } }
          : {}),
        ...(anyHdr
          ? { hdr: { notIn: ["SDR"] } }
          : explicitHdr?.length
            ? { hdr: { in: explicitHdr } }
            : {}),
      },
    });
  }

  const audioListQuery = rubyTierPreset
    ? { ...query, premiumAudio: undefined }
    : query;
  releaseFilters.push(...buildCatalogAudioReleaseFilters(audioListQuery));

  if (query.tvReady === "true") {
    releaseFilters.push(tvReadyReleaseWhere());
  }

  if (query.language || query.channelLayout) {
    const langs = query.language?.split(",").filter(Boolean);
    const layouts = query.channelLayout?.split(",").filter(Boolean);
    releaseFilters.push({
      audioTracks: {
        some: {
          ...(langs?.length ? { language: { in: langs } } : {}),
          ...(layouts?.length ? { channelLayout: { in: layouts } } : {}),
        },
      },
    });
  }

  if (query.subtitleLang) {
    const langs = query.subtitleLang.split(",").filter(Boolean);
    releaseFilters.push({
      subtitleTracks: {
        some: { language: { in: langs } },
      },
    });
  }

  if (releaseFilters.length === 1) {
    Object.assign(where, releaseSome(releaseFilters[0]));
  } else if (releaseFilters.length > 1) {
    const existingAnd = Array.isArray(where.AND)
      ? where.AND
      : where.AND
        ? [where.AND]
        : [];
    where.AND = [
      ...existingAnd,
      ...releaseFilters.map((filter) => releaseSome(filter)),
    ];
  }

  return where;
}

export function buildMovieOrder(
  query: ReturnType<typeof parseListQuery>,
): Prisma.MovieOrderByWithRelationInput[] {
  const order = query.order ?? "asc";
  switch (query.sort) {
    case "year":
      return [{ year: order }, { id: order }];
    case "createdAt":
      return [{ createdAt: order }, { id: order }];
    case "rating":
      return [{ rating: order }, { id: order }];
    case "watchedAt":
      return [{ watchedAt: order }, { id: order }];
    case "durationSeconds":
    case "fileSize":
    case "fileDownloadedAt":
      throw new Error(
        `Sort "${query.sort}" is handled by fetchMovieList release aggregate ordering`,
      );
    default:
      return [{ title: order }, { id: order }];
  }
}
