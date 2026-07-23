import type { ReleaseWithTracks } from "@/lib/movies/movie-include";
import { resolveCatalogAudioTrack } from "@/lib/builds/build-track-source";
import {
  inferTierFrom4kHdrAndAudioTracks,
  buildSpotlightFromVisual,
  maxSpotlightTier,
  type BuildVisualTier,
} from "@/lib/media/tier-core";
import {
  releaseTier,
  type ReleaseTier,
} from "@/lib/media/release-tags";
import {
  releaseTierToSpotlight,
  type SpotlightTier,
} from "@/lib/media/tier-presentation";

export type { BuildVisualTier } from "@/lib/media/tier-core";

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
  return release
    ? resolveCatalogAudioTrack(release, track.sourceStreamIndex)
    : null;
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

  const audioTracks = build.tracks
    .map((track) => audioTrackFromBuild(build.sources, track))
    .filter((track): track is ReleaseWithTracks["audioTracks"][number] => track != null);

  return inferTierFrom4kHdrAndAudioTracks(videoRelease, audioTracks);
}

export { buildSpotlightFromVisual };

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
  return maxSpotlightTier(pool.map((b) => b.visualTier));
}

/** Maps build visual tier to laser-frame / card glow release tier. */
export function buildLaserTier(tier: BuildVisualTier | null): ReleaseTier {
  if (tier === "ruby" || tier === "gold") return tier;
  return null;
}
