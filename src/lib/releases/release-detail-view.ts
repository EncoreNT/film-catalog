import type { SpecTagKind } from "@/lib/media/spec-tags";
import type { ReleaseWithTracks } from "@/lib/movies/movie-query";
import { displayFilePath } from "@/lib/shared/display-path";
import {
  releaseHasExternalStorage,
  releaseStorageIsExternal,
  releaseStorageLabel,
} from "@/lib/releases/release-storage";
import { formatDate, formatFileSizeGB } from "@/lib/shared/format";
import { formatBitrateKbps, formatFps } from "@/lib/shared/resolution";
import {
  codecFull,
  codecShort,
  formatAudioLabel,
  is4K,
  premiumAudio,
  premiumHdrView,
  releaseTabLabel,
  secondaryTags,
  translationShort,
  videoBitrateLabel,
  videoResolutionPixels,
} from "@/lib/media/spec-tags";

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
  showRibbon: boolean;
  premium4K: boolean;
  vPixels: string | null;
  premiumHdr: { label: string; isDolbyVision: boolean } | null;
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

function buildAudioTrack(
  track: ReleaseWithTracks["audioTracks"][number],
): ReleaseDetailAudioTrack {
  const profile =
    track.profile && track.profile !== "None" ? track.profile : null;
  const is3D = profile === "Atmos" || profile === "DTS:X MA";
  const bitrate = formatBitrateKbps(track.bitrate);

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
  const premiumHdr = premiumHdrView(release);
  const premiumAtmos = premiumAudio(release);
  const hasResolution = !!(
    release.videoTrack?.resolutionLabel &&
    release.videoTrack.resolutionLabel !== "other"
  );
  const showRibbon = hasResolution || premiumHdr != null || premiumAtmos != null;

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
    showRibbon,
    premium4K,
    vPixels,
    premiumHdr: premiumHdr
      ? { label: premiumHdr.label, isDolbyVision: premiumHdr.isDolbyVision }
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
      fps: formatFps(release.videoTrack?.fps)?.replace(/fps$/, "") ?? null,
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
    storageLabel: releaseStorageLabel(release),
    storageExternal: releaseStorageIsExternal(release),
    createdAtLabel: formatDate(release.createdAt),
    updatedAtLabel: formatDate(release.updatedAt),
  };
}

export function buildReleaseDetailViews(
  releases: ReleaseWithTracks[],
): ReleaseDetailView[] {
  return releases.map(buildReleaseDetailView);
}
