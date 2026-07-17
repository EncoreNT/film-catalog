import type { ReleaseWithTracks } from "@/lib/movies/movie-include";
import {
  audioTrackChannelCount,
  is4K,
  isAnyHDR,
  releaseTier,
  type ReleaseTier,
} from "@/lib/media/release-tags";
import { normalizeAudioProfile } from "@/lib/media/quality-predicates";
import {
  releaseTierToSpotlight,
  type SpotlightTier,
} from "@/lib/media/tier-presentation";

/** Catalog tier for a build job card / spotlight (includes non-premium "standard"). */
export type BuildVisualTier = ReleaseTier | "standard";

export type BuildTierSource = {
  role: string;
  releaseId: number;
  release: ReleaseWithTracks;
};

export type BuildTierTrack = {
  kind: string;
  sourceReleaseId: number | null;
  sourceStreamIndex: number;
};

export type BuildTierInput = {
  sources: BuildTierSource[];
  tracks: BuildTierTrack[];
  outputRelease: ReleaseWithTracks | null;
};

function releaseForSource(
  sources: BuildTierSource[],
  releaseId: number,
): ReleaseWithTracks | undefined {
  return sources.find((s) => s.releaseId === releaseId)?.release;
}

function audioTrackFromBuild(
  sources: BuildTierSource[],
  track: BuildTierTrack,
): ReleaseWithTracks["audioTracks"][number] | null {
  if (track.kind !== "AUDIO" || track.sourceReleaseId == null) return null;
  const release = releaseForSource(sources, track.sourceReleaseId);
  return (
    release?.audioTracks.find((a) => a.streamIndex === track.sourceStreamIndex) ??
    null
  );
}

/**
 * Planned or finished MKV tier for UI (ruby / gold / standard).
 * Uses registered output when present; otherwise infers from video source + muxed tracks.
 */
export function resolveBuildVisualTier(build: BuildTierInput): BuildVisualTier | null {
  if (build.outputRelease?.videoTrack) {
    return releaseTier(build.outputRelease) ?? "standard";
  }

  const videoRelease = build.sources.find((s) => s.role === "video")?.release;
  if (!videoRelease?.videoTrack) return null;

  if (!is4K(videoRelease) || !isAnyHDR(videoRelease)) {
    return "standard";
  }

  for (const track of build.tracks) {
    const audio = audioTrackFromBuild(build.sources, track);
    if (!audio) continue;
    if (audio.language !== "rus" || audio.translationType !== "dub") continue;
    if (
      normalizeAudioProfile(audio.profile) === "Atmos" &&
      audioTrackChannelCount(audio) >= 8
    ) {
      return "ruby";
    }
  }

  for (const track of build.tracks) {
    const audio = audioTrackFromBuild(build.sources, track);
    if (audio && audioTrackChannelCount(audio) >= 6) {
      return "gold";
    }
  }

  return "standard";
}

export function buildSpotlightFromVisual(
  tier: BuildVisualTier | null,
): SpotlightTier {
  if (tier === "ruby") return "ruby";
  if (tier === "gold") return "gold";
  if (tier === "standard") return "standard";
  return "general";
}

/** Spotlight for a single build detail page. */
export function buildDetailSpotlightTier(build: BuildTierInput): SpotlightTier {
  const visual = resolveBuildVisualTier(build);
  if (visual === "ruby" || visual === "gold") {
    return releaseTierToSpotlight(visual);
  }
  if (visual === "standard") return "standard";
  return "general";
}

/** Best spotlight among queue items (prefers active jobs when provided). */
export function resolveBuildQueueSpotlightTier(
  items: Array<{ visualTier: BuildVisualTier | null; status: string }>,
): SpotlightTier {
  const active = items.filter(
    (b) => b.status === "RUNNING" || b.status === "QUEUED",
  );
  const pool = active.length > 0 ? active : items;
  if (pool.length === 0) return "general";

  const tiers = pool.map((b) => b.visualTier);
  if (tiers.some((t) => t === "ruby")) return "ruby";
  if (tiers.some((t) => t === "gold")) return "gold";
  if (tiers.some((t) => t === "standard")) return "standard";
  return "general";
}

/** Maps build visual tier to laser-frame / card glow release tier. */
export function buildLaserTier(tier: BuildVisualTier | null): ReleaseTier {
  if (tier === "ruby" || tier === "gold") return tier;
  return null;
}
