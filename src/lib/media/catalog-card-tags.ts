import type { ReleaseWithTracks } from "@/lib/movies/movie-include";
import {
  codecFull,
  codecShort,
  formatAudioLabel,
  mainAudioTrack,
  premiumAudio,
  translationShort,
} from "@/lib/media/audio-labels";
import { formatHdrLabel } from "@/lib/shared/dictionaries";
import {
  hdrCatalogTag,
  is4K,
  releaseMetaTags,
  resolutionTag,
  type CatalogCardTag,
  type SpecTagKind,
} from "@/lib/media/release-tags";

export type { CatalogCardTag, SpecTagKind };

/**
 * Структурированные tech-данные основного релиза для нижней линии карточки
 * каталога: тип релиза, разрешение, видео-кодек/HDR, аудио-кодек/каналы/перевод.
 * Используется в компактной строке с dot-паттерном (видео/аудио раскрываются
 * по hover), чтобы экономить место на карточке.
 */
export interface CardTech {
  releaseType: string | null;
  resolution: string | null;
  resolutionPixels: string | null;
  is4K: boolean;
  videoCodec: string | null;
  hdr: string | null;
  audioLabel: string | null;
  audioCodecShort: string | null;
  audioCodecFull: string | null;
  channels: string | null;
  translation: string | null;
}

export function catalogCardTech(release: ReleaseWithTracks): CardTech {
  const v = release.videoTrack;
  const meta = releaseMetaTags(release);
  const releaseType = meta.find((t) => t.kind === "release")?.label ?? null;
  const resTag = resolutionTag(v);
  const main = mainAudioTrack(release);

  return {
    releaseType,
    resolution: resTag?.label ?? null,
    resolutionPixels: resTag?.note ?? null,
    is4K: is4K(release),
    videoCodec: videoCodecLabel(v?.codec),
    hdr: v?.hdr ? formatHdrLabel(v.hdr) : null,
    audioLabel: main ? formatAudioLabel(main) : null,
    audioCodecShort: main ? codecShort(main.codec) : null,
    audioCodecFull: main ? codecFull(main.codec) : null,
    channels:
      main?.channelLayout && main.channelLayout !== "other"
        ? main.channelLayout
        : null,
    translation: main ? translationShort(main.translationType) : null,
  };
}

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
