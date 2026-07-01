import type { FranchiseWithSlots } from "./franchise-include";
import type { MovieWithTracks } from "./movie-query";
import { orderedMovieGenres } from "./movie-genres";
import {
  dictLabel,
  displayMovieVersionLabel,
  genreLabel,
  RELEASE_TYPES,
  parseHdrValue,
} from "./dictionaries";
import { formatDuration } from "./format";
import {
  is4K,
  isAnyHDR,
  premiumAudio,
  formatAudioLabel,
  mainAudioTrack,
  codecShort,
  videoBitrateLabel,
  videoResolutionPixels,
} from "./spec-tags";

/**
 * Per-slot quality tier. The tier encodes HOW MANY of the three premium
 * specs (4K, HDR, рус. Atmos) a film has — never a single misleading label
 * applied to the whole franchise. Missing slots are their own tier so the
 * reel can render the gap honestly.
 */
export type SlotTier = "missing" | "basic" | "premium-1" | "premium-2" | "elite";

export interface FranchiseSlotSummary {
  /** 0-based position in story order. */
  index: number;
  filled: boolean;
  title: string | null;
  year: number | null;
  tier: SlotTier;
  fourK: boolean;
  hdr: boolean;
  atmos: boolean;
  elite: boolean;
  /** Compact resolution badge text (4K / FHD / HD / SD) for the reel cell. */
  resolution: string | null;
  /** Compact dynamic-range badge text (HDR10 / HDR10+ / DV / SDR). */
  dynamicRange: string | null;
  /** Short audio code for the reel cell (ATMOS / DTS:X / TRUEHD / AC3 …). */
  audio: string | null;
  /** Full audio label for the tooltip (e.g. "TrueHD Atmos"). */
  audioFull: string | null;
  /** Hint when the slot is empty. */
  titleHint: string | null;
  yearHint: number | null;
  /** Catalog slug — filled slots only. */
  slug: string | null;
  rating: number | null;
  durationLabel: string | null;
  /** Localized genre labels in display order. */
  genreLabels: string[];
  versionLabel: string | null;
  releaseTypeLabel: string | null;
  videoCodec: string | null;
  videoBitrate: string | null;
  resolutionPixels: string | null;
}

/** Compact quality summary for aria labels and tooltips. */
export function slotQualityLabel(slot: FranchiseSlotSummary): string {
  if (!slot.filled) return "не хватает";
  const parts: string[] = [];
  if (slot.resolution) parts.push(slot.resolution);
  if (slot.dynamicRange) parts.push(slot.dynamicRange);
  if (slot.audioFull) parts.push(slot.audioFull);
  return parts.length ? parts.join(" · ") : "стандартное качество";
}

const RESOLUTION_SHORT: Record<string, string> = {
  "4K": "4K",
  "1080p": "FHD",
  "720p": "HD",
  "480p": "SD",
};

function slotResolution(movie: MovieWithTracks | null): string | null {
  const label = movie?.videoTrack?.resolutionLabel;
  if (!label || label === "other") return null;
  return RESOLUTION_SHORT[label] ?? label;
}

function slotDynamicRange(movie: MovieWithTracks | null): string | null {
  const v = movie?.videoTrack;
  if (!v?.hdr) return "SDR";
  const { base } = parseHdrValue(v.hdr);
  if (base === "SDR") return "SDR";
  if (base === "HDR10") return "HDR10";
  if (base === "HDR10+") return "HDR10+";
  if (base === "DolbyVision") return "DV";
  return "HDR";
}

const AUDIO_SHORT: Record<string, string> = {
  truehd: "TRUEHD",
  eac3: "EAC3",
  ac3: "AC3",
  "dts-hd": "DTS-HD",
  dts: "DTS",
  aac: "AAC",
  flac: "FLAC",
  opus: "OPUS",
  vorbis: "VORBIS",
  pcm: "PCM",
  mp3: "MP3",
};

function slotAudioShort(movie: MovieWithTracks | null): string | null {
  const track = movie ? mainAudioTrack(movie) : null;
  if (!track) return null;
  const profile =
    track.profile && track.profile !== "None" ? track.profile : null;
  if (profile === "Atmos") return "ATMOS";
  if (profile === "DTS:X MA") return "DTS:X";
  if (track.codec) return AUDIO_SHORT[track.codec] ?? track.codec.toUpperCase();
  return profile;
}

function slotAudioFull(movie: MovieWithTracks | null): string | null {
  const track = movie ? mainAudioTrack(movie) : null;
  return track ? formatAudioLabel(track) : null;
}

export interface FranchiseSummary {
  total: number;
  filled: number;
  missing: number;
  slots: FranchiseSlotSummary[];
  yearStart: number | null;
  yearEnd: number | null;
  totalRuntimeSeconds: number | null;
  averageRating: number | null;
  ratedCount: number;
  premium: { fourK: number; hdr: number; atmos: number; elite: number };
  /** Every owned film is elite (and at least one is owned). */
  allElite: boolean;
}

function slotYear(slot: FranchiseWithSlots["slots"][number]): number | null {
  if (slot.movie?.year != null) return slot.movie.year;
  return slot.yearHint ?? null;
}

function slotTitle(slot: FranchiseWithSlots["slots"][number]): string | null {
  if (slot.movie?.title) return slot.movie.title;
  return slot.titleHint ?? null;
}

/** Quality tier for a single linked film (or "missing" when none is linked). */
export function slotTier(movie: MovieWithTracks | null): SlotTier {
  if (!movie) return "missing";
  const fourK = is4K(movie);
  const hdr = isAnyHDR(movie);
  const atmos = premiumAudio(movie) != null;
  const score = [fourK, hdr, atmos].filter(Boolean).length;
  if (score >= 3) return "elite";
  if (score === 2) return "premium-2";
  if (score === 1) return "premium-1";
  return "basic";
}

/**
 * Derive every franchise-level metric shown on the list card from the already
 * loaded `franchiseInclude` relations — no extra DB round-trips.
 */
export function computeFranchiseSummary(
  franchise: FranchiseWithSlots,
): FranchiseSummary {
  const sorted = [...franchise.slots].sort((a, b) => a.storyOrder - b.storyOrder);

  const slots: FranchiseSlotSummary[] = sorted.map((slot, index) => {
    const movie = (slot.movie ?? null) as MovieWithTracks | null;
    const filled = slot.movieId != null;
    const fourK = movie ? is4K(movie) : false;
    const hdr = movie ? isAnyHDR(movie) : false;
    const atmos = movie ? premiumAudio(movie) != null : false;
    const elite = fourK && hdr && atmos;
    const durationLabel =
      movie?.durationSeconds != null
        ? formatDuration(movie.durationSeconds)
        : null;
    return {
      index,
      filled,
      title: slotTitle(slot),
      year: slotYear(slot),
      tier: slotTier(movie),
      fourK,
      hdr,
      atmos,
      elite,
      resolution: slotResolution(movie),
      dynamicRange: slotDynamicRange(movie),
      audio: slotAudioShort(movie),
      audioFull: slotAudioFull(movie),
      titleHint: slot.titleHint ?? null,
      yearHint: slot.yearHint ?? null,
      slug: movie?.slug ?? null,
      rating: movie?.rating ?? null,
      durationLabel,
      genreLabels: movie
        ? orderedMovieGenres(movie).map((g) => genreLabel(g.name) ?? g.name)
        : [],
      versionLabel: movie ? displayMovieVersionLabel(movie.version) : null,
      releaseTypeLabel: movie
        ? dictLabel(RELEASE_TYPES, movie.releaseType)
        : null,
      videoCodec: movie?.videoTrack?.codec
        ? codecShort(movie.videoTrack.codec)
        : null,
      videoBitrate: movie ? videoBitrateLabel(movie) : null,
      resolutionPixels: movie ? videoResolutionPixels(movie) : null,
    };
  });

  const total = slots.length;
  const filled = slots.filter((s) => s.filled).length;
  const missing = total - filled;

  const years = slots
    .map((s) => s.year)
    .filter((y): y is number => y != null);
  const yearStart = years.length ? Math.min(...years) : null;
  const yearEnd = years.length ? Math.max(...years) : null;

  let runtimeSeconds = 0;
  let runtimeHas = false;
  let ratingSum = 0;
  let ratedCount = 0;
  let ownedElite = 0;
  for (const slot of sorted) {
    const movie = slot.movie as MovieWithTracks | null;
    if (!movie) continue;
    if (movie.durationSeconds && movie.durationSeconds > 0) {
      runtimeSeconds += movie.durationSeconds;
      runtimeHas = true;
    }
    if (movie.rating != null) {
      ratingSum += movie.rating;
      ratedCount += 1;
    }
    if (
      is4K(movie) &&
      isAnyHDR(movie) &&
      premiumAudio(movie) != null
    ) {
      ownedElite += 1;
    }
  }

  const totalRuntimeSeconds = runtimeHas ? runtimeSeconds : null;
  const averageRating = ratedCount
    ? Math.round((ratingSum / ratedCount) * 10) / 10
    : null;

  const premium = {
    fourK: slots.filter((s) => s.fourK).length,
    hdr: slots.filter((s) => s.hdr).length,
    atmos: slots.filter((s) => s.atmos).length,
    elite: slots.filter((s) => s.elite).length,
  };

  const allElite = filled > 0 && ownedElite === filled;

  return {
    total,
    filled,
    missing,
    slots,
    yearStart,
    yearEnd,
    totalRuntimeSeconds,
    averageRating,
    ratedCount,
    premium,
    allElite,
  };
}
