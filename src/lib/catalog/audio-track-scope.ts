import type { Prisma } from "@/generated/prisma/client";
import { ORIGINAL_TRANSLATION_TYPE, RUS_LANGUAGE } from "@/lib/catalog/russian-audio-formats";

export type AudioTrackScope = "rus" | "original";

export interface AudioTrackScopeFields {
  language: string | null;
  translationType: string | null;
}

/**
 * Whether an audio track belongs to the Russian-dub or explicitly-tagged
 * original scope. "Original" is `translationType === "original"` only — not
 * every non-Russian track (an English author dub must not count).
 */
export function matchesAudioTrackScope(
  track: AudioTrackScopeFields,
  scope: AudioTrackScope,
): boolean {
  if (scope === "rus") return track.language === RUS_LANGUAGE;
  return track.translationType === ORIGINAL_TRANSLATION_TYPE;
}

/** Prisma `where` fragment for scoping audio-track filters and facets. */
export function audioTrackScopeWhere(
  scope: AudioTrackScope,
): Prisma.AudioTrackWhereInput {
  return scope === "rus"
    ? { language: RUS_LANGUAGE }
    : { translationType: ORIGINAL_TRANSLATION_TYPE };
}
