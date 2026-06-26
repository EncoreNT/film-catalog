import type { Prisma } from "@/generated/prisma/client";
import { movieListQuerySchema } from "./validators";

export type MovieWithTracks = Prisma.MovieGetPayload<{
  include: {
    videoTrack: true;
    audioTracks: true;
    subtitleTracks: true;
    storage: true;
    genres: { orderBy: { name: "asc" } };
  };
}>;

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
    where.durationSeconds = {
      ...(minSec != null ? { gte: minSec } : {}),
      ...(maxSec != null ? { lte: maxSec } : {}),
    };
  }

  if (query.genre) {
    const genres = query.genre.split(",").filter(Boolean);
    if (genres.length === 1) {
      where.genres = { some: { name: genres[0] } };
    } else if (genres.length > 1) {
      where.genres = { some: { name: { in: genres } } };
    }
  }

  const hasWatchedRange = Boolean(query.watchedFrom || query.watchedTo);
  if (query.watched === "unwatched" && hasWatchedRange) {
    // Unwatched movies cannot match a watched-date range.
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

  if (query.resolution || query.hdr) {
    const resolutions = query.resolution?.split(",").filter(Boolean);
    const hdrValues = query.hdr?.split(",").filter(Boolean);
    // "HDR_ANY" marker → any HDR that is not SDR (incl. Dolby Vision + profiles).
    const anyHdr = hdrValues?.includes("HDR_ANY");
    const explicitHdr = hdrValues?.filter((v) => v !== "HDR_ANY");
    where.videoTrack = {
      ...(resolutions?.length
        ? { resolutionLabel: { in: resolutions } }
        : {}),
      ...(anyHdr
        ? { hdr: { notIn: ["SDR"] } }
        : explicitHdr?.length
          ? { hdr: { in: explicitHdr } }
          : {}),
    };
  }

  const audioTrackFilters: Prisma.MovieWhereInput[] = [];

  if (query.premiumAudio === "true") {
    audioTrackFilters.push({
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
    audioTrackFilters.push({
      audioTracks: {
        some: {
          ...(langs?.length ? { language: { in: langs } } : {}),
          ...(layouts?.length ? { channelLayout: { in: layouts } } : {}),
        },
      },
    });
  }

  if (audioTrackFilters.length === 1) {
    Object.assign(where, audioTrackFilters[0]);
  } else if (audioTrackFilters.length > 1) {
    const existingAnd = Array.isArray(where.AND)
      ? where.AND
      : where.AND
        ? [where.AND]
        : [];
    where.AND = [...existingAnd, ...audioTrackFilters];
  }

  if (query.subtitleLang) {
    const langs = query.subtitleLang.split(",").filter(Boolean);
    where.subtitleTracks = {
      some: { language: { in: langs } },
    };
  }

  return where;
}

export function buildMovieOrder(
  query: ReturnType<typeof parseListQuery>,
): Prisma.MovieOrderByWithRelationInput {
  const order = query.order ?? "asc";
  switch (query.sort) {
    case "year":
      return { year: order };
    case "createdAt":
      return { createdAt: order };
    case "rating":
      return { rating: order };
    case "watchedAt":
      return { watchedAt: order };
    case "durationSeconds":
      return { durationSeconds: order };
    default:
      return { title: order };
  }
}
