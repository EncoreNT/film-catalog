import type { FranchiseWithSlots } from "./franchise-include";
import type { MovieWithTracks } from "./movie-query";
import { is4K, isAnyHDR, premiumAudio, formatAudioLabel } from "./spec-tags";
import { parseHdrValue } from "./dictionaries";

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
  /** Compact audio badge text (e.g. "TrueHD Atmos", "AC3"). */
  audio: string | null;
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

function slotAudio(movie: MovieWithTracks | null): string | null {
  if (!movie || movie.audioTracks.length === 0) return null;
  const sorted = [...movie.audioTracks].sort((a, b) => {
    const a3D =
      a.profile === "Atmos" || a.profile === "DTS:X MA" ? 1 : 0;
    const b3D =
      b.profile === "Atmos" || b.profile === "DTS:X MA" ? 1 : 0;
    if (a3D !== b3D) return b3D - a3D;
    if (a.isDefault && !b.isDefault) return -1;
    if (!a.isDefault && b.isDefault) return 1;
    return 0;
  });
  return formatAudioLabel(sorted[0]);
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
      audio: slotAudio(movie),
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
