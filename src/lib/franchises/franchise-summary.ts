import type { FranchiseWithSlots } from "@/lib/franchises/franchise-include";
import type { MovieWithTracks } from "@/lib/movies/movie-query";
import { orderedMovieGenres } from "@/lib/movies/movie-genres";
import {
  displayGenreName,
  displayMovieVersionLabel,
  dictLabel,
  RELEASE_TYPES,
  parseHdrValue,
} from "@/lib/shared/dictionaries";
import { formatDuration } from "@/lib/shared/format";
import { pickPrimaryRelease } from "@/lib/releases/release-primary";
import {
  is4K,
  isAnyHDR,
  premiumAudio,
  formatAudioLabel,
  mainAudioTrack,
  codecShort,
  videoBitrateLabel,
  videoResolutionPixels,
} from "@/lib/media/spec-tags";

function primaryRelease(movie: MovieWithTracks | null) {
  if (!movie) return null;
  return pickPrimaryRelease(movie.releases);
}

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
  const release = primaryRelease(movie);
  const label = release?.videoTrack?.resolutionLabel;
  if (!label || label === "other") return null;
  return RESOLUTION_SHORT[label] ?? label;
}

function slotDynamicRange(movie: MovieWithTracks | null): string | null {
  const v = primaryRelease(movie)?.videoTrack;
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
  const release = primaryRelease(movie);
  const track = release ? mainAudioTrack(release) : null;
  if (!track) return null;
  const profile =
    track.profile && track.profile !== "None" ? track.profile : null;
  if (profile === "Atmos") return "ATMOS";
  if (profile === "DTS:X MA") return "DTS:X";
  if (track.codec) return AUDIO_SHORT[track.codec] ?? track.codec.toUpperCase();
  return profile;
}

function slotAudioFull(movie: MovieWithTracks | null): string | null {
  const release = primaryRelease(movie);
  const track = release ? mainAudioTrack(release) : null;
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
  const release = primaryRelease(movie);
  if (!release) return "basic";
  const fourK = is4K(release);
  const hdr = isAnyHDR(release);
  const atmos = premiumAudio(release) != null;
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
    const release = primaryRelease(movie);
    const filled = slot.movieId != null;
    const fourK = release ? is4K(release) : false;
    const hdr = release ? isAnyHDR(release) : false;
    const atmos = release ? premiumAudio(release) != null : false;
    const elite = fourK && hdr && atmos;
    const durationLabel =
      release?.durationSeconds != null
        ? formatDuration(release.durationSeconds)
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
        ? orderedMovieGenres(movie).map((g) => displayGenreName(g.name))
        : [],
      versionLabel: release ? displayMovieVersionLabel(release.version) : null,
      releaseTypeLabel: release
        ? dictLabel(RELEASE_TYPES, release.releaseType)
        : null,
      videoCodec: release?.videoTrack?.codec
        ? codecShort(release.videoTrack.codec)
        : null,
      videoBitrate: release ? videoBitrateLabel(release) : null,
      resolutionPixels: release ? videoResolutionPixels(release) : null,
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
    const release = primaryRelease(movie);
    if (release?.durationSeconds && release.durationSeconds > 0) {
      runtimeSeconds += release.durationSeconds;
      runtimeHas = true;
    }
    if (movie.rating != null) {
      ratingSum += movie.rating;
      ratedCount += 1;
    }
    if (
      release &&
      is4K(release) &&
      isAnyHDR(release) &&
      premiumAudio(release) != null
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
