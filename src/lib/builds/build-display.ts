import type { LucideIcon } from "lucide-react";
import { Film, AudioLines, Captions } from "lucide-react";
import type { ReleaseWithTracks } from "@/lib/movies/movie-include";
import {
  codecShort,
  formatAudioLabel,
  translationShort,
} from "@/lib/media/audio-labels";
import { dictLabel, LANGUAGES } from "@/lib/shared/dictionaries";
import { formatBitrateKbps } from "@/lib/shared/resolution";
import { releaseTier } from "@/lib/media/release-tags";
import type { ReleaseTier } from "@/lib/media/release-tags";
import type { BuildTrackKind } from "@/lib/builds/build-recipe-state";
import {
  isAc3FamilyCodec,
  isHigherThanAc3Codec,
} from "@/lib/builds/build-presets";

export type TranscodeQualityHint = {
  title: string;
  detail: string;
};

/** Inline hint when transcode mode is unlikely to improve audio quality. */
export function transcodeQualityHint(
  sourceCodec: string | null | undefined,
): TranscodeQualityHint | null {
  if (isAc3FamilyCodec(sourceCodec)) {
    return {
      title: "Уже AC-3 или E-AC3",
      detail: "Перекодирование не улучшит качество. Оставьте режим «Копировать».",
    };
  }
  if (!isHigherThanAc3Codec(sourceCodec)) {
    return {
      title: "Источник слабее AC-3",
      detail: "Перекодирование в E-AC3 не даст выигрыша по звуку.",
    };
  }
  return null;
}

export type TierTone = "ruby" | "gold" | "none";

export function sourceTierTone(release: ReleaseWithTracks): TierTone {
  const tier = releaseTier(release);
  if (tier === "ruby") return "ruby";
  if (tier === "gold") return "gold";
  return "none";
}

/** Text + border tint for a source's tier, used on deck headers and track chips. */
export const TIER_TONE: Record<TierTone, { text: string; border: string; dot: string; ring: string }> = {
  ruby: {
    text: "text-crimson-bright",
    border: "border-crimson/45",
    dot: "bg-crimson-bright shadow-[0_0_6px_rgba(224,62,98,0.55)]",
    ring: "ring-crimson/30",
  },
  gold: {
    text: "text-accent",
    border: "border-accent/45",
    dot: "bg-accent-bright shadow-[0_0_6px_var(--accent-glow)]",
    ring: "ring-accent/30",
  },
  none: {
    text: "text-text",
    border: "border-border",
    dot: "bg-white/45",
    ring: "ring-white/10",
  },
};

export interface KindMeta {
  icon: LucideIcon;
  label: string;
  /** Accent text color used for the kind glyph. */
  tone: string;
  /** Subtle pill background for the kind badge. */
  pill: string;
}

export function kindMeta(kind: BuildTrackKind): KindMeta {
  switch (kind) {
    case "video":
      return {
        icon: Film,
        label: "Видео",
        tone: "text-accent",
        pill: "border-accent/35 bg-accent/[0.08] text-accent",
      };
    case "audio":
      return {
        icon: AudioLines,
        label: "Аудио",
        tone: "text-neural-bright",
        pill: "border-neural/35 bg-neural/[0.08] text-neural-bright",
      };
    case "subtitle":
      return {
        icon: Captions,
        label: "Субтитры",
        tone: "text-ember-bright",
        pill: "border-ember/35 bg-ember/[0.08] text-ember-bright",
      };
  }
}

export interface SpecTag {
  label: string;
  /** Optional secondary tone; null/undefined = default muted. */
  tone?: "accent" | "neural" | "ember" | "danger" | null;
}

const SPEC_TONE_CLASS: Record<NonNullable<SpecTag["tone"]>, string> = {
  accent: "text-accent",
  neural: "text-neural-bright",
  ember: "text-ember-bright",
  danger: "text-danger",
};

export function specTagClass(tag: SpecTag): string {
  return tag.tone ? SPEC_TONE_CLASS[tag.tone] : "text-muted";
}

type AnySourceTrack =
  | ReleaseWithTracks["videoTrack"]
  | ReleaseWithTracks["audioTracks"][number]
  | ReleaseWithTracks["subtitleTracks"][number];

/** Build the spec chips for a source track, used in both the deck and the reel. */
export function trackSpecTags(
  track: AnySourceTrack | null,
  kind: BuildTrackKind,
): SpecTag[] {
  if (!track) return [];
  const tags: SpecTag[] = [];

  if (kind === "video") {
    const v = track as ReleaseWithTracks["videoTrack"];
    if (v?.resolutionLabel && v.resolutionLabel !== "other") {
      tags.push({
        label: v.resolutionLabel === "4K" ? "4K" : v.resolutionLabel,
        tone: "accent",
      });
    }
    if (v?.codec) tags.push({ label: v.codec.toUpperCase() });
    if (v?.hdr && v.hdr !== "SDR") tags.push({ label: v.hdr, tone: "accent" });
    if (v?.fps) tags.push({ label: `${v.fps} fps` });
    return tags;
  }

  if (kind === "audio") {
    const a = track as ReleaseWithTracks["audioTracks"][number];
    const label = formatAudioLabel(a);
    if (label) tags.push({ label, tone: "neural" });
    if (a.channelLayout && a.channelLayout !== "other") {
      tags.push({ label: a.channelLayout });
    }
    const bitrate = formatBitrateKbps(a.bitrate);
    if (bitrate) tags.push({ label: bitrate });
    if (a.language) {
      tags.push({ label: dictLabel(LANGUAGES, a.language) ?? a.language });
    }
    const tr = translationShort(a.translationType);
    if (tr) tags.push({ label: tr });
    return tags;
  }

  const s = track as ReleaseWithTracks["subtitleTracks"][number];
  if (s.language) tags.push({ label: dictLabel(LANGUAGES, s.language) ?? s.language });
  if (s.codecLabel) tags.push({ label: s.codecLabel });
  if (s.forced) tags.push({ label: "форс.", tone: "ember" });
  return tags;
}

/** Human label for a source track (title or synthesized fallback). */
export function sourceTrackLabel(
  track:
    | ReleaseWithTracks["videoTrack"]
    | ReleaseWithTracks["audioTracks"][number]
    | ReleaseWithTracks["subtitleTracks"][number]
    | null,
  kind: BuildTrackKind,
): string {
  if (!track) return kind === "video" ? "Видео" : kind;
  if (kind === "video") {
    const v = track as ReleaseWithTracks["videoTrack"];
    const res = v?.resolutionLabel && v.resolutionLabel !== "other" ? v.resolutionLabel : null;
    return res ? `Видео ${res}` : "Видео";
  }
  if (kind === "audio") {
    const a = track as ReleaseWithTracks["audioTracks"][number];
    if (a.title) return a.title;
    const parts = [
      dictLabel(LANGUAGES, a.language) ?? a.language ?? "?",
      codecShort(a.codec) ?? "",
      a.channelLayout ?? "",
    ].filter(Boolean);
    return parts.join(" ").trim() || `Аудио ${a.streamIndex}`;
  }
  const s = track as ReleaseWithTracks["subtitleTracks"][number];
  return s.title || dictLabel(LANGUAGES, s.language) || `Субтитры ${s.streamIndex}`;
}

/** Format a signed millisecond offset for inline display. */
export function formatOffset(ms: number | undefined): string {
  const value = ms ?? 0;
  if (value === 0) return "0 мс";
  const sign = value > 0 ? "+" : "−";
  return `${sign}${Math.abs(value)} мс`;
}

export type { ReleaseTier };
