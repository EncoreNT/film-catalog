import type { Prisma } from "@/generated/prisma/client";

/**
 * Curated Russian-audio format presets. Each preset maps a user-facing label
 * (the vocabulary a collector thinks in — "AC-3", "DTS-HD MA"…) to a Prisma
 * condition that matches a single Russian audio track.
 *
 * Profiles are stored as `null` for plain codecs and as "HD MA" / "Atmos" /
 * "DTS:X MA" for profiled ones. Plain E-AC-3 uses `profile: null` to stay
 * disjoint from Atmos; TrueHD matches any profile (most UHD remuxes are
 * TrueHD Atmos). Object-sound tiers (Atmos / DTS:X) are also exposed via
 * the `premiumAudio` toggle.
 */
export interface RusAudioFormat {
  value: string;
  label: string;
  where: Prisma.AudioTrackWhereInput;
}

export const RUS_AUDIO_FORMATS: RusAudioFormat[] = [
  { value: "ac3", label: "AC-3", where: { codec: "ac3" } },
  { value: "eac3", label: "E-AC-3", where: { codec: "eac3", profile: null } },
  { value: "dts", label: "DTS", where: { codec: "dts" } },
  {
    value: "dts-hd-ma",
    label: "DTS-HD MA",
    where: { codec: "dts-hd", profile: "HD MA" },
  },
  {
    value: "truehd",
    label: "TrueHD",
    where: { codec: "truehd" },
  },
  { value: "aac", label: "AAC", where: { codec: "aac" } },
  { value: "flac", label: "FLAC", where: { codec: "flac" } },
];

export const RUS_LANGUAGE = "rus";

/** Tracks explicitly tagged as the original-language mix (from ffprobe title). */
export const ORIGINAL_TRANSLATION_TYPE = "original";
