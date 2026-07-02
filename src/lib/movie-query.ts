import type { Prisma } from "@/generated/prisma/client";
import { movieListQuerySchema } from "./validators";
import { RUS_AUDIO_FORMATS } from "./russian-audio-formats";
import { audioTrackScopeWhere } from "./audio-track-scope";

export type MovieWithTracks = Prisma.MovieGetPayload<{
  include: typeof import("@/lib/movie-include").movieInclude;
}>;

export type ReleaseWithTracks = MovieWithTracks["releases"][number];

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

export function buildMovieWhere(
  query: ReturnType<typeof parseListQuery>,
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
    where.title = { contains: query.q };
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
    releaseFilters.push({
      audioTracks: {
        some: {
          isDefault: true,
          language: "rus",
          profile: { in: ["Atmos", "DTS:X MA"] },
        },
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
      // Prisma cannot order Movie by max(release.durationSeconds) on SQLite;
      // use createdAt as a stable proxy until denormalized duration is added.
      return [{ createdAt: order }, { id: order }];
    default:
      return [{ title: order }, { id: order }];
  }
}
