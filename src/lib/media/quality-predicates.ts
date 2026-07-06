import type { Prisma } from "@/generated/prisma/client";
import { ORIGINAL_TRANSLATION_TYPE } from "@/lib/catalog/russian-audio-formats";
import { parseHdrValue } from "@/lib/shared/dictionaries";

/** Spatial / object-based audio profiles (Atmos, DTS:X). */
export const SPATIAL_AUDIO_PROFILES = ["Atmos", "DTS:X MA"] as const;

export type SpatialAudioProfile = (typeof SPATIAL_AUDIO_PROFILES)[number];

export type AudioTrackLike = {
  profile?: string | null;
  language?: string | null;
  isDefault?: boolean;
  translationType?: string | null;
};

export function normalizeAudioProfile(
  profile: string | null | undefined,
): string | null {
  if (!profile || profile === "None") return null;
  return profile;
}

export function isSpatialAudioProfile(
  profile: string | null | undefined,
): boolean {
  const normalized = normalizeAudioProfile(profile);
  return (
    normalized === "Atmos" ||
    normalized === "DTS:X MA"
  );
}

/** Default Russian track with Atmos or DTS:X MA — catalog «premium audio» filter. */
export function isPremiumRussianAtmosTrack(track: AudioTrackLike): boolean {
  return (
    isSpatialAudioProfile(track.profile) &&
    track.language === "rus" &&
    track.isDefault === true
  );
}

export const premiumRussianAtmosAudioTrackWhere = {
  isDefault: true,
  language: "rus",
  profile: { in: [...SPATIAL_AUDIO_PROFILES] },
} satisfies Prisma.AudioTrackWhereInput;

/** Original-language mix with Atmos or DTS:X MA — catalog facet filter. */
export function isPremiumOriginalSpatialTrack(track: AudioTrackLike): boolean {
  return (
    isSpatialAudioProfile(track.profile) &&
    track.translationType === ORIGINAL_TRANSLATION_TYPE
  );
}

export const premiumOriginalSpatialAudioTrackWhere = {
  translationType: ORIGINAL_TRANSLATION_TYPE,
  profile: { in: [...SPATIAL_AUDIO_PROFILES] },
} satisfies Prisma.AudioTrackWhereInput;

export const russianAtmosAudioWhere = {
  releases: {
    some: {
      audioTracks: {
        some: premiumRussianAtmosAudioTrackWhere,
      },
    },
  },
} satisfies Prisma.MovieWhereInput;

/**
 * Archive dashboard «elite»: movie has 4K, non-SDR HDR, and Russian Atmos
 * each on **at least one release** (specs may be split across releases).
 *
 * Franchise slot `slotTier()` uses **one primary release** — all three on the
 * same file. Same word, different aggregation strategy.
 */
export const archiveEliteTierWhere = {
  AND: [
    {
      releases: {
        some: { videoTrack: { resolutionLabel: "4K" } },
      },
    },
    {
      releases: {
        some: { videoTrack: { hdr: { notIn: ["SDR"] } } },
      },
    },
    russianAtmosAudioWhere,
  ],
} satisfies Prisma.MovieWhereInput;

/** Compact HDR badge for franchise reel / cards (HDR10 / DV / SDR …). */
export function hdrShortLabel(hdr: string | null | undefined): string {
  if (!hdr) return "SDR";
  const { base } = parseHdrValue(hdr);
  if (base === "SDR") return "SDR";
  if (base === "HDR10") return "HDR10";
  if (base === "HDR10+") return "HDR10+";
  if (base === "DolbyVision") return "DV";
  return "HDR";
}
