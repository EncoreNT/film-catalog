import type { ReleaseWithTracks } from "@/lib/movies/movie-include";
import {
  formatAudioLabel,
  mainAudioTrack,
  premiumAudio,
} from "@/lib/media/audio-labels";
import {
  hdrCatalogTag,
  is4K,
  releaseMetaTags,
  resolutionTag,
  type CatalogCardTag,
  type SpecTagKind,
} from "@/lib/media/release-tags";

export type { CatalogCardTag, SpecTagKind };

const VIDEO_CODEC_SHORT: Record<string, string> = {
  hevc: "HEVC",
  h264: "H.264",
  av1: "AV1",
  vp9: "VP9",
  mpeg2: "MPEG-2",
};

function videoCodecLabel(codec: string | null | undefined): string | null {
  if (!codec) return null;
  return VIDEO_CODEC_SHORT[codec] ?? codec.toUpperCase();
}

const PROMINENT_CATALOG_TAG_KINDS = new Set<SpecTagKind>([
  "resolution",
  "hdr",
  "audio-3d",
]);

function sortCatalogCardTags(tags: CatalogCardTag[]): CatalogCardTag[] {
  const prominent: CatalogCardTag[] = [];
  const regular: CatalogCardTag[] = [];
  for (const tag of tags) {
    if (PROMINENT_CATALOG_TAG_KINDS.has(tag.kind)) {
      prominent.push(tag);
    } else {
      regular.push(tag);
    }
  }
  return [...prominent, ...regular];
}

export function catalogCardTags(release: ReleaseWithTracks): CatalogCardTag[] {
  const tags: CatalogCardTag[] = [...releaseMetaTags(release)];
  const v = release.videoTrack;
  const show4KPremium = is4K(release);
  const audioPremium = premiumAudio(release);

  const resTag = resolutionTag(v, { omit4K: show4KPremium });
  if (resTag) tags.push(resTag);

  const hdrTag = hdrCatalogTag(release);
  if (hdrTag) tags.push(hdrTag);

  const codec = videoCodecLabel(v?.codec);
  if (codec) {
    tags.push({ kind: "codec", label: codec });
  }

  const mainTrack = mainAudioTrack(release);
  const audioLabel = mainTrack ? formatAudioLabel(mainTrack) : null;
  const isPremiumTrack =
    audioPremium &&
    mainTrack?.isDefault &&
    mainTrack.language === "rus" &&
    (mainTrack.profile === "Atmos" || mainTrack.profile === "DTS:X MA");

  if (audioLabel && !isPremiumTrack) {
    tags.push({
      kind:
        mainTrack?.profile === "Atmos" ||
        mainTrack?.profile === "DTS:X MA"
          ? "audio-3d"
          : "audio",
      label: audioLabel,
    });
  }

  const channels =
    mainTrack?.channelLayout && mainTrack.channelLayout !== "other"
      ? mainTrack.channelLayout
      : null;
  if (channels) {
    tags.push({ kind: "channel", label: channels });
  }

  return sortCatalogCardTags(tags);
}
