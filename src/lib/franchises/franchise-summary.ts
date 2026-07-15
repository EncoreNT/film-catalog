import type { FranchiseWithSlots } from "@/lib/franchises/franchise-include";
import type { MovieWithTracks } from "@/lib/movies/movie-query";
import { orderedMovieGenres } from "@/lib/movies/movie-genres";
import {
  displayGenreName,
  displayMovieVersionLabel,
  dictLabel,
  RELEASE_TYPES,
} from "@/lib/shared/dictionaries";
import { hdrShortLabel, normalizeAudioProfile } from "@/lib/media/quality-predicates";
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
  releaseTier,
  type ReleaseTier,
} from "@/lib/media/spec-tags";

import {
  FRANCHISE_SLOT_FUTURE_ARIA,
  FRANCHISE_SLOT_MISSING_ARIA,
} from "@/lib/franchises/franchise-slot-copy";

function primaryRelease(movie: MovieWithTracks | null) {
  if (!movie) return null;
  return pickPrimaryRelease(movie.releases);
}

/**
 * Per-slot quality tier, unified with the project's release tier language
 * (`releaseTier` → ruby / gold / null). A linked film is "ruby" (4K + any
 * HDR + рус. Atmos ≥ 7.1 on the best dub) or "gold" (4K + any HDR + surround
 * ≥ 5.1 on the main track); a linked film that does not qualify is
 * "standard", and an unlinked slot is "missing". The reel and tooltip use
 * the same ruby / gold / standard vocabulary as the movie card and release
 * tab, so a franchise slot reads identically to the catalog.
 */
export type SlotTier = "missing" | "standard" | "gold" | "ruby";

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
  /** Empty slot marked as announced release without a known year. */
  isAnnounced: boolean;
  /** True when effective year (film or hint) is after the current calendar year. */
  isFuture: boolean;
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
  if (!slot.filled) {
    return slot.isFuture
      ? FRANCHISE_SLOT_FUTURE_ARIA
      : FRANCHISE_SLOT_MISSING_ARIA;
  }
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
  return hdrShortLabel(v?.hdr ?? null);
}

function slotAudioShort(movie: MovieWithTracks | null): string | null {
  const release = primaryRelease(movie);
  const track = release ? mainAudioTrack(release) : null;
  if (!track) return null;
  const profile = normalizeAudioProfile(track.profile);
  if (profile === "Atmos") return "ATMOS";
  if (profile === "DTS:X MA") return "DTS:X";
  if (track.codec) return codecShort(track.codec)?.toUpperCase() ?? track.codec.toUpperCase();
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
  premium: { fourK: number; hdr: number; atmos: number };
  /**
   * Franchise-level tier — only for a **complete** collection among films that
   * have already been released (year ≤ current calendar year). Future slots
   * are ignored. Ruby when every relevant film is ruby; gold when every
   * relevant film is gold or ruby. Any standard film or a missing non-future
   * slot clears the tier.
   */
  tier: ReleaseTier;
}

/** True when the slot is a future release: year after now, or unreleased flag with no year / current year. */
export function isFutureFranchiseSlot(
  slot: {
    year: number | null;
    filled?: boolean;
    isAnnounced?: boolean;
  },
  currentYear: number,
): boolean {
  if (slot.year != null && slot.year > currentYear) return true;
  if (slot.filled === true || !slot.isAnnounced) return false;
  return slot.year == null || slot.year === currentYear;
}

/** Empty slot may toggle «ещё не вышел» when year is empty or equals the calendar year. */
export function canMarkSlotUnreleased(
  year: number | null | undefined,
  currentYear = new Date().getFullYear(),
): boolean {
  return year == null || year === currentYear;
}

/**
 * Collection-wide franchise tier among released slots only. Future films/slots
 * do not affect fill completeness or quality checks.
 */
export function computeFranchiseCollectionTier(
  slots: FranchiseSlotSummary[],
  currentYear = new Date().getFullYear(),
): ReleaseTier {
  const relevant = slots.filter(
    (s) =>
      !isFutureFranchiseSlot(
        {
          year: s.year,
          filled: s.filled,
          isAnnounced: s.isAnnounced ?? false,
        },
        currentYear,
      ),
  );
  if (relevant.length === 0) return null;

  const filled = relevant.filter((s) => s.filled).length;
  if (filled === 0 || filled !== relevant.length) return null;

  const owned = relevant.filter((s) => s.filled);
  if (owned.some((s) => s.tier === "standard")) return null;
  if (owned.every((s) => s.tier === "ruby")) return "ruby";
  if (owned.every((s) => s.tier === "ruby" || s.tier === "gold")) return "gold";
  return null;
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
  if (!release) return "standard";
  const tier = releaseTier(release);
  if (tier === "ruby") return "ruby";
  if (tier === "gold") return "gold";
  return "standard";
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
    const durationLabel =
      release?.durationSeconds != null
        ? formatDuration(release.durationSeconds)
        : null;
    const slotYearValue = slotYear(slot);
    return {
      index,
      filled,
      title: slotTitle(slot),
      year: slotYearValue,
      tier: slotTier(movie),
      isFuture: isFutureFranchiseSlot(
        {
          year: slotYearValue,
          filled,
          isAnnounced: slot.isAnnounced,
        },
        new Date().getFullYear(),
      ),
      fourK,
      hdr,
      atmos,
      resolution: slotResolution(movie),
      dynamicRange: slotDynamicRange(movie),
      audio: slotAudioShort(movie),
      audioFull: slotAudioFull(movie),
      titleHint: slot.titleHint ?? null,
      yearHint: slot.yearHint ?? null,
      isAnnounced: slot.isAnnounced,
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
  }

  const totalRuntimeSeconds = runtimeHas ? runtimeSeconds : null;
  const averageRating = ratedCount
    ? Math.round((ratingSum / ratedCount) * 10) / 10
    : null;

  const premium = {
    fourK: slots.filter((s) => s.fourK).length,
    hdr: slots.filter((s) => s.hdr).length,
    atmos: slots.filter((s) => s.atmos).length,
  };

  const franchiseTier = computeFranchiseCollectionTier(slots);

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
    tier: franchiseTier,
  };
}
