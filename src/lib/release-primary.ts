import type { Prisma } from "@/generated/prisma/client";
import type { releaseInclude } from "./movie-include";

export type ReleaseWithTracks = Prisma.ReleaseGetPayload<{
  include: typeof releaseInclude;
}>;

const RESOLUTION_RANK: Record<string, number> = {
  "4K": 100,
  "1080p": 80,
  "720p": 60,
  "576p": 40,
  "480p": 30,
  other: 10,
};

const RELEASE_TYPE_RANK: Record<string, number> = {
  bdremux: 100,
  bluray: 90,
  hybrid: 85,
  "web-dl": 70,
  webrip: 60,
  bdrip: 50,
  hdtvrip: 30,
  dvdrip: 20,
};

function resolutionScore(label: string | null | undefined): number {
  if (!label) return 0;
  return RESOLUTION_RANK[label] ?? 0;
}

function hdrScore(hdr: string | null | undefined): number {
  if (!hdr || hdr === "SDR") return 0;
  if (hdr.startsWith("HDR10+")) return 30;
  if (hdr.startsWith("HDR10")) return 25;
  if (hdr.startsWith("DolbyVision")) return 35;
  if (hdr.startsWith("HLG")) return 15;
  return 10;
}

function premiumAudioScore(release: ReleaseWithTracks): number {
  const hasPremium = release.audioTracks.some((t) => {
    const profile = t.profile && t.profile !== "None" ? t.profile : null;
    return (
      (profile === "Atmos" || profile === "DTS:X MA") &&
      t.language === "rus" &&
      t.isDefault
    );
  });
  return hasPremium ? 20 : 0;
}

function releaseTypeScore(releaseType: string | null | undefined): number {
  if (!releaseType) return 0;
  return RELEASE_TYPE_RANK[releaseType] ?? 0;
}

/** Rank a release for catalog card / primary display selection. */
export function rankRelease(release: ReleaseWithTracks): number {
  const v = release.videoTrack;
  return (
    resolutionScore(v?.resolutionLabel) +
    hdrScore(v?.hdr) +
    premiumAudioScore(release) +
    releaseTypeScore(release.releaseType)
  );
}

/** Pick the best release for catalog badges and card display. */
export function pickPrimaryRelease<T extends ReleaseWithTracks>(
  releases: T[],
): T | null {
  if (releases.length === 0) return null;
  return [...releases].sort((a, b) => {
    const diff = rankRelease(b) - rankRelease(a);
    if (diff !== 0) return diff;
    return a.id - b.id;
  })[0];
}

/** True when any release has a readable file path. */
export function movieHasFile(releases: Pick<ReleaseWithTracks, "filePath">[]): boolean {
  return releases.some((r) => !!r.filePath);
}

/** True when any release is on external storage. */
export function movieHasExternalStorage(
  releases: Pick<ReleaseWithTracks, "storage">[],
): boolean {
  return releases.some((r) => r.storage?.type === "EXTERNAL");
}
