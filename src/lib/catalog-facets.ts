import { prisma } from "./prisma";
import { MovieStatus } from "@/generated/prisma/client";
import { matchesAudioTrackScope } from "./audio-track-scope";
import {
  ORIGINAL_TRANSLATION_TYPE,
  RUS_AUDIO_FORMATS,
} from "./russian-audio-formats";

export interface FacetOption {
  value: string | null;
  count: number;
}

export interface CatalogFacets {
  resolutions: FacetOption[];
  russianChannelLayouts: FacetOption[];
  originalChannelLayouts: FacetOption[];
  russianTranslationTypes: FacetOption[];
  russianAudioFormats: FacetOption[];
  originalAudioFormats: FacetOption[];
}

export interface CatalogGenreFacet {
  value: string;
  count: number;
}

export type AudioFacetRow = {
  movieId: number;
  language: string | null;
  channelLayout: string | null;
  translationType: string | null;
  codec: string | null;
  profile: string | null;
};

type VideoFacetRow = {
  movieId: number;
  resolutionLabel: string | null;
};

type Scope = "rus" | "original";

type FormatWhere = { codec?: string | null; profile?: string | null };

function distinctMovieCounts(
  rows: AudioFacetRow[],
  pick: (row: AudioFacetRow) => string | null,
  scope: Scope,
): FacetOption[] {
  const buckets = new Map<string, Set<number>>();
  for (const row of rows) {
    if (!matchesAudioTrackScope(row, scope)) continue;
    const key = pick(row);
    if (!key) continue;
    const set = buckets.get(key);
    if (set) set.add(row.movieId);
    else buckets.set(key, new Set([row.movieId]));
  }
  return [...buckets.entries()].map(([value, set]) => ({
    value,
    count: set.size,
  }));
}

function formatMovieCounts(rows: AudioFacetRow[], scope: Scope): FacetOption[] {
  return RUS_AUDIO_FORMATS.map((fmt) => {
    const w = fmt.where as FormatWhere;
    const movies = new Set<number>();
    for (const row of rows) {
      if (!matchesAudioTrackScope(row, scope)) continue;
      if (row.codec == null) continue;
      if (w.codec !== undefined && row.codec !== w.codec) continue;
      if (w.profile !== undefined && row.profile !== w.profile) continue;
      movies.add(row.movieId);
    }
    return { value: fmt.value, count: movies.size };
  });
}

export function buildCatalogFacetsFromRows(
  audioRows: AudioFacetRow[],
  videoRows: VideoFacetRow[],
): CatalogFacets {
  const resolutionBuckets = new Map<string, Set<number>>();
  for (const row of videoRows) {
    if (!row.resolutionLabel) continue;
    const set = resolutionBuckets.get(row.resolutionLabel);
    if (set) set.add(row.movieId);
    else resolutionBuckets.set(row.resolutionLabel, new Set([row.movieId]));
  }

  return {
    resolutions: [...resolutionBuckets.entries()].map(([value, set]) => ({
      value,
      count: set.size,
    })),
    russianChannelLayouts: distinctMovieCounts(
      audioRows,
      (r) => r.channelLayout,
      "rus",
    ),
    originalChannelLayouts: distinctMovieCounts(
      audioRows,
      (r) => r.channelLayout,
      "original",
    ),
    russianTranslationTypes: distinctMovieCounts(
      audioRows,
      (r) => r.translationType,
      "rus",
    ).filter((f) => f.value !== ORIGINAL_TRANSLATION_TYPE),
    russianAudioFormats: formatMovieCounts(audioRows, "rus"),
    originalAudioFormats: formatMovieCounts(audioRows, "original"),
  };
}

export async function getCatalogFacets(
  statuses?: MovieStatus[],
): Promise<CatalogFacets> {
  const scoped = !!statuses?.length;
  const releaseWhere = scoped
    ? { movie: { status: { in: statuses! } } }
    : {};

  const [audioRows, videoRows] = await Promise.all([
    prisma.audioTrack.findMany({
      where: { release: releaseWhere },
      select: {
        release: { select: { movieId: true } },
        language: true,
        channelLayout: true,
        translationType: true,
        codec: true,
        profile: true,
      },
    }),
    prisma.videoTrack.findMany({
      where: { release: releaseWhere },
      select: {
        release: { select: { movieId: true } },
        resolutionLabel: true,
      },
    }),
  ]);

  return buildCatalogFacetsFromRows(
    audioRows.map((row) => ({
      movieId: row.release.movieId,
      language: row.language,
      channelLayout: row.channelLayout,
      translationType: row.translationType,
      codec: row.codec,
      profile: row.profile,
    })),
    videoRows.map((row) => ({
      movieId: row.release.movieId,
      resolutionLabel: row.resolutionLabel,
    })),
  );
}

export async function getCatalogGenreFacets(
  statuses: MovieStatus[] = [MovieStatus.CATALOG],
): Promise<CatalogGenreFacet[]> {
  const genres = await prisma.genre.findMany({
    where: {
      movieGenres: { some: { movie: { status: { in: statuses } } } },
    },
    select: {
      name: true,
      _count: { select: { movieGenres: true } },
    },
    orderBy: { name: "asc" },
  });

  return genres.map((genre) => ({
    value: genre.name,
    count: genre._count.movieGenres,
  }));
}
