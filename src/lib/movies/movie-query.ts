import type { Prisma } from "@/generated/prisma/client";
import { movieListQuerySchema } from "@/lib/api/validators";
import { RUS_AUDIO_FORMATS } from "@/lib/catalog/russian-audio-formats";
import { audioTrackScopeWhere } from "@/lib/catalog/audio-track-scope";
import { normalizeSearchQuery } from "@/lib/movies/movie-match-key";
import { premiumOriginalSpatialAudioTrackWhere, premiumRussianAtmosAudioTrackWhere } from "@/lib/media/quality-predicates";
import { prisma } from "@/lib/db/prisma";

export type { MovieWithTracks } from "@/lib/movies/movie-include";

export function parseListQuery(searchParams: URLSearchParams) {
  const raw = Object.fromEntries(searchParams.entries());
  return movieListQuerySchema.parse({
    ...raw,
    page: raw.page ?? "1",
    limit: raw.limit ?? "48",
    sort: raw.sort ?? "title",
    order: raw.order ?? "asc",
    status: raw.status ?? "CATALOG",
    watched: raw.watched ?? "all",
  });
}

function releaseSome(
  releaseWhere: Prisma.ReleaseWhereInput,
): Prisma.MovieWhereInput {
  return { releases: { some: releaseWhere } };
}

interface BuildMovieWhereContext {
  multiReleaseMovieIds?: number[];
}

/** Movie ids with 2+ releases (for multiRelease catalog filter). */
export async function fetchMultiReleaseMovieIds(): Promise<number[]> {
  const groups = await prisma.release.groupBy({
    by: ["movieId"],
    _count: { _all: true },
    having: {
      movieId: {
        _count: {
          gte: 2,
        },
      },
    },
  });
  return groups.map((g) => g.movieId);
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

  if (query.resolution || query.hdr) {
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

  if (query.premiumAudio === "true") {
    const premiumScope = query.audioScope === "original" ? "original" : "rus";
    releaseFilters.push({
      audioTracks: {
        some:
          premiumScope === "original"
            ? premiumOriginalSpatialAudioTrackWhere
            : premiumRussianAtmosAudioTrackWhere,
      },
    });
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

  const audioScope = query.audioScope === "original" ? "original" : "rus";
  const audioChannels = query.audioChannels?.split(",").filter(Boolean) ?? [];
  const audioFormats = query.audioFormat?.split(",").filter(Boolean) ?? [];
  const audioTranslations =
    query.audioTranslation?.split(",").filter(Boolean) ?? [];
  const formatWhere = audioFormats
    .map((v) => RUS_AUDIO_FORMATS.find((f) => f.value === v)?.where)
    .filter((w): w is Prisma.AudioTrackWhereInput => Boolean(w));

  if (audioScope === "rus") {
    if (
      audioChannels.length ||
      formatWhere.length ||
      audioTranslations.length
    ) {
      releaseFilters.push({
        audioTracks: {
          some: {
            ...audioTrackScopeWhere("rus"),
            ...(audioTranslations.length
              ? { translationType: { in: audioTranslations } }
              : {}),
            ...(audioChannels.length
              ? { channelLayout: { in: audioChannels } }
              : {}),
            ...(formatWhere.length ? { OR: formatWhere } : {}),
          },
        },
      });
    }
  } else if (audioChannels.length || formatWhere.length) {
    releaseFilters.push({
      audioTracks: {
        some: {
          ...audioTrackScopeWhere("original"),
          ...(audioChannels.length
            ? { channelLayout: { in: audioChannels } }
            : {}),
          ...(formatWhere.length ? { OR: formatWhere } : {}),
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
      throw new Error(
        `Sort "${query.sort}" is handled by fetchMovieList release aggregate ordering`,
      );
    default:
      return [{ title: order }, { id: order }];
  }
}
