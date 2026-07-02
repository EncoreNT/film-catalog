import type { SpecTagKind } from "@/components/SpecTag";
import type { ReleaseWithTracks } from "./movie-query";
import { displayFilePath } from "./display-path";
import { formatDate, formatFileSizeGB } from "./format";
import {
  codecFull,
  codecShort,
  formatAudioLabel,
  is4K,
  premiumAudio,
  premiumHDR,
  releaseTabLabel,
  secondaryTags,
  translationShort,
  videoBitrateLabel,
  videoResolutionPixels,
} from "./spec-tags";

export type ReleaseDetailTag = {
  kind: SpecTagKind;
  label: string;
  note?: string;
};

export type ReleaseDetailAudioTrack = {
  id: number;
  isDefault: boolean;
  languageCode: string | null;
  langLabel: string | null;
  translation: string | null;
  formatLabel: string | null;
  is3D: boolean;
  codecFullLabel: string | null;
  channelLayout: string | null;
  bitrate: string | null;
  title: string | null;
};

export type ReleaseDetailSubtitleTrack = {
  id: number;
  codecLabel: string | null;
  language: string | null;
  forced: boolean;
  title: string | null;
};

export type ReleaseDetailView = {
  id: number;
  label: string;
  showPremiumStrip: boolean;
  premium4K: boolean;
  vPixels: string | null;
  premiumHdr: { label: string; sublabel: string } | null;
  premiumAtmos: { label: string; sublabel: string } | null;
  tags: ReleaseDetailTag[];
  video: {
    hasData: boolean;
    resolution: string;
    vPixels: string | null;
    vBitrateValue: string | null;
    vBitrateUnit: string;
    codec: string | null;
    fps: string | null;
  };
  audioTracks: ReleaseDetailAudioTrack[];
  subtitleTracks: ReleaseDetailSubtitleTrack[];
  filePath: string | null;
  filePathDisplay: string | null;
  fileSizeLabel: string | null;
  storageLabel: string | null;
  storageExternal: boolean;
  createdAtLabel: string;
  updatedAtLabel: string;
};

function formatFps(fps: string | number | null | undefined): string | null {
  if (fps == null) return null;
  const n = typeof fps === "string" ? parseFloat(fps) : fps;
  if (Number.isNaN(n)) return null;
  return String(Math.round(n * 100) / 100);
}

function buildAudioTrack(
  track: ReleaseWithTracks["audioTracks"][number],
): ReleaseDetailAudioTrack {
  const profile =
    track.profile && track.profile !== "None" ? track.profile : null;
  const is3D = profile === "Atmos" || profile === "DTS:X MA";
  const bitrate = track.bitrate
    ? track.bitrate >= 1000
      ? `${(track.bitrate / 1000).toFixed(1)}Mbps`
      : `${track.bitrate}kbps`
    : null;

  return {
    id: track.id,
    isDefault: track.isDefault,
    languageCode: track.language,
    langLabel: track.language ? track.language.toUpperCase() : null,
    translation: translationShort(track.translationType),
    formatLabel: formatAudioLabel(track),
    is3D,
    codecFullLabel: codecFull(track.codec),
    channelLayout:
      track.channelLayout && track.channelLayout !== "other"
        ? track.channelLayout
        : null,
    bitrate,
    title: track.title,
  };
}

export function buildReleaseDetailView(
  release: ReleaseWithTracks,
): ReleaseDetailView {
  const vPixels = videoResolutionPixels(release);
  const vBitrate = videoBitrateLabel(release);
  const premium4K = is4K(release);
  const premiumHdr = premiumHDR(release);
  const premiumAtmos = premiumAudio(release);
  const showPremiumStrip = premium4K || premiumHdr != null || premiumAtmos != null;

  const resolution =
    release.videoTrack?.resolutionLabel &&
    release.videoTrack.resolutionLabel !== "other"
      ? release.videoTrack.resolutionLabel === "4K"
        ? "4K"
        : release.videoTrack.resolutionLabel
      : "—";

  return {
    id: release.id,
    label: releaseTabLabel(release),
    showPremiumStrip,
    premium4K,
    vPixels,
    premiumHdr: premiumHdr
      ? { label: premiumHdr.label, sublabel: premiumHdr.sublabel }
      : null,
    premiumAtmos: premiumAtmos
      ? {
          label: premiumAtmos.label,
          sublabel: premiumAtmos.channelLayout ?? "Object Audio",
        }
      : null,
    tags: secondaryTags(release).map((tag) => ({
      kind: tag.kind,
      label: tag.label,
      note: tag.note,
    })),
    video: {
      hasData: !!(release.videoTrack || release.releaseType),
      resolution,
      vPixels,
      vBitrateValue: vBitrate ? vBitrate.replace(/[a-z]+/i, "").trim() : null,
      vBitrateUnit: vBitrate?.match(/[a-zA-Z]+/)?.[0] ?? "",
      codec: release.videoTrack?.codec
        ? codecShort(release.videoTrack.codec) ??
          release.videoTrack.codec.toUpperCase()
        : null,
      fps: formatFps(release.videoTrack?.fps),
    },
    audioTracks: [...release.audioTracks]
      .sort((a, b) => {
        if (a.isDefault && !b.isDefault) return -1;
        if (!a.isDefault && b.isDefault) return 1;
        return 0;
      })
      .map(buildAudioTrack),
    subtitleTracks: release.subtitleTracks.map((track) => ({
      id: track.id,
      codecLabel: track.codecLabel ?? track.codec ?? null,
      language: track.language,
      forced: track.forced,
      title: track.title,
    })),
    filePath: release.filePath,
    filePathDisplay: release.filePath
      ? displayFilePath(release.filePath)
      : null,
    fileSizeLabel: formatFileSizeGB(release.fileSize),
    storageLabel: release.storage?.name ?? null,
    storageExternal: release.storage?.type === "EXTERNAL",
    createdAtLabel: formatDate(release.createdAt),
    updatedAtLabel: formatDate(release.updatedAt),
  };
}

export function buildReleaseDetailViews(
  releases: ReleaseWithTracks[],
): ReleaseDetailView[] {
  return releases.map(buildReleaseDetailView);
}
