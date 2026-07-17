import type { SerializedBuild } from "@/lib/builds/build-serialize";
import { channelTargetLabel } from "@/lib/builds/build-presets";
import type { SpecTag } from "@/lib/builds/build-display";
import type { BuildTrackKind } from "@/lib/builds/build-recipe-state";
import type { ReleaseWithTracks } from "@/lib/movies/movie-include";
import {
  codecShort,
  formatAudioLabel,
  translationShort,
} from "@/lib/media/audio-labels";
import {
  dictLabel,
  displayMovieVersionLabel,
  LANGUAGES,
  RELEASE_TYPES,
} from "@/lib/shared/dictionaries";
import { formatOffset } from "@/lib/builds/build-display";
import { formatBitrateKbps } from "@/lib/shared/resolution";
import { buildOutputBasename } from "@/lib/builds/build-queue-display";

type SerializedTrack = SerializedBuild["tracks"][number];

export const BUILD_PHASE_LABELS: Record<string, string> = {
  starting: "Запуск",
  prepare: "Подготовка",
  transcode: "Перекодирование аудио",
  mux: "Сборка MKV",
  finalize: "Финализация",
  register: "Регистрация релиза",
  recovered: "Восстановление после сбоя",
};

export function buildPhaseLabel(phase: string | null | undefined): string | null {
  if (!phase) return null;
  return BUILD_PHASE_LABELS[phase] ?? phase;
}

export function normalizeBuildTrackKind(kind: SerializedTrack["kind"]): BuildTrackKind {
  return kind.toLowerCase() as BuildTrackKind;
}

export function buildSourceRoleLabel(role: string): string {
  if (role === "video") return "Видео-источник";
  if (role === "tracks") return "Дорожки и субтитры";
  return role;
}

export function buildAudioModeLabel(
  mode: SerializedTrack["audioMode"],
): string | null {
  if (!mode) return null;
  return mode === "TRANSCODE" ? "Перекодирование" : "Копирование";
}

export function formatBuildDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) return "—";
  return new Date(ms).toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export interface BuildTimelineEntry {
  key: string;
  label: string;
  value: string;
  hint?: string;
}

export function buildTimelineEntries(build: SerializedBuild): BuildTimelineEntry[] {
  const entries: BuildTimelineEntry[] = [
    {
      key: "created",
      label: "Создана",
      value: formatBuildDateTime(build.createdAt),
    },
  ];

  if (build.startedAt) {
    entries.push({
      key: "started",
      label: "Запущена",
      value: formatBuildDateTime(build.startedAt),
    });
  }

  if (build.finishedAt) {
    entries.push({
      key: "finished",
      label: "Завершена",
      value: formatBuildDateTime(build.finishedAt),
    });
  }

  if (build.cancelRequested) {
    entries.push({
      key: "cancel",
      label: "Отмена",
      value: "Запрошена",
      hint: "Worker завершит текущий шаг и остановит сборку",
    });
  }

  return entries;
}

export function buildOutputMeta(build: SerializedBuild): {
  basename: string;
  releaseType: string | null;
  version: string | null;
  storage: string | null;
} {
  const releaseType = build.outputReleaseType
    ? dictLabel(RELEASE_TYPES, build.outputReleaseType)
    : null;
  const version = displayMovieVersionLabel(build.outputVersion);
  const storage = build.externalStorage?.name ?? "Локальный диск";

  return {
    basename: buildOutputBasename(build.outputPath),
    releaseType,
    version,
    storage,
  };
}

export function buildTrackDetailTags(track: SerializedTrack): SpecTag[] {
  const tags: SpecTag[] = [];
  const kind = normalizeBuildTrackKind(track.kind);

  tags.push({
    label: `stream ${track.sourceStreamIndex}`,
  });

  if (kind === "audio") {
    const mode = buildAudioModeLabel(track.audioMode);
    if (mode) tags.push({ label: mode, tone: mode === "Перекодирование" ? "neural" : null });

    if (track.audioMode === "TRANSCODE") {
      if (track.transcodeCodec) {
        tags.push({
          label: track.transcodeCodec.toUpperCase(),
          tone: "neural",
        });
      }
      if (track.transcodeBitrate != null) {
        tags.push({ label: `${track.transcodeBitrate} kbps` });
      }
      if (track.channelTarget) {
        const target =
          track.channelTarget === "STEREO" ? "stereo" : ("up_to_51" as const);
        tags.push({ label: channelTargetLabel(target) });
      }
    }
  }

  if (track.offsetMs !== 0) {
    tags.push({ label: formatOffset(track.offsetMs), tone: "ember" });
  }

  if (track.isDefault) {
    tags.push({ label: "по умолчанию", tone: "accent" });
  }

  if (track.forced) {
    tags.push({ label: "форс.", tone: "ember" });
  }

  if (track.keepOriginal && track.audioMode === "TRANSCODE") {
    tags.push({ label: "+ оригинал", tone: "neural" });
  }

  return tags;
}

export function buildTrackTitle(track: SerializedTrack): string {
  if (track.sourceTrackLabel?.trim()) return track.sourceTrackLabel.trim();
  const kind = normalizeBuildTrackKind(track.kind);
  const meta = kind === "video" ? "Видео" : kind === "audio" ? "Аудио" : "Субтитры";
  return `${meta} · stream ${track.sourceStreamIndex}`;
}

export function buildTrackFlags(track: SerializedTrack): string[] {
  const flags: string[] = [];
  if (track.isDefault) flags.push("главная");
  if (track.forced) flags.push("форс.");
  if (track.keepOriginal && track.audioMode === "TRANSCODE") {
    flags.push("+ оригинал");
  }
  if (track.offsetMs !== 0) flags.push(formatOffset(track.offsetMs));
  return flags;
}

export type BuildTrackActionTone = "neutral" | "accent" | "neural";

/** One-line action for the build detail composition (copy vs transcode target). */
export function buildTrackActionSummary(track: SerializedTrack): {
  label: string;
  tone: BuildTrackActionTone;
} {
  const kind = normalizeBuildTrackKind(track.kind);

  if (kind === "video" || kind === "subtitle") {
    return { label: "Копирование", tone: "neutral" };
  }

  if (track.audioMode === "TRANSCODE") {
    const parts: string[] = [];
    if (track.transcodeCodec) {
      parts.push(track.transcodeCodec.toUpperCase());
    }
    if (track.transcodeBitrate != null) {
      parts.push(`${track.transcodeBitrate}`);
    }
    if (track.channelTarget === "STEREO") {
      parts.push("stereo");
    } else if (track.channelTarget === "UP_TO_51") {
      parts.push("5.1");
    }
    return {
      label: parts.length > 0 ? `→ ${parts.join(" · ")}` : "Перекодирование",
      tone: "neural",
    };
  }

  return { label: "Копирование", tone: "neutral" };
}

export type BuildSourceRelease = Pick<
  ReleaseWithTracks,
  "id" | "videoTrack" | "audioTracks" | "subtitleTracks"
>;

export function buildSourceReleaseMap(
  sources: SerializedBuild["sources"],
): Map<number, BuildSourceRelease> {
  const map = new Map<number, BuildSourceRelease>();
  for (const source of sources) {
    if (source.release) {
      map.set(source.release.id, source.release);
    }
  }
  return map;
}

export function resolveBuildSourceTrack(
  releases: Map<number, BuildSourceRelease>,
  track: SerializedTrack,
):
  | ReleaseWithTracks["videoTrack"]
  | ReleaseWithTracks["audioTracks"][number]
  | ReleaseWithTracks["subtitleTracks"][number]
  | null {
  if (track.sourceReleaseId == null) return null;
  const release = releases.get(track.sourceReleaseId);
  if (!release) return null;

  const kind = normalizeBuildTrackKind(track.kind);
  if (kind === "video") return release.videoTrack;
  if (kind === "audio") {
    return (
      release.audioTracks.find((item) => item.streamIndex === track.sourceStreamIndex) ??
      null
    );
  }
  return (
    release.subtitleTracks.find((item) => item.streamIndex === track.sourceStreamIndex) ??
    null
  );
}

export function buildVideoTechLine(
  video: NonNullable<ReleaseWithTracks["videoTrack"]>,
): string {
  const parts: string[] = [];
  if (video.codec) parts.push(video.codec.toUpperCase());
  if (video.resolutionLabel && video.resolutionLabel !== "other") {
    parts.push(video.resolutionLabel === "4K" ? "4K UHD" : video.resolutionLabel);
  } else if (video.width != null && video.height != null) {
    parts.push(`${video.width}×${video.height}`);
  }
  if (video.hdr && video.hdr !== "SDR") parts.push(video.hdr);
  if (video.fps) parts.push(`${video.fps} fps`);
  const bitrate = formatBitrateKbps(video.bitrate);
  if (bitrate) parts.push(bitrate);
  return parts.join(" · ");
}

export function buildAudioTechLine(
  audio: ReleaseWithTracks["audioTracks"][number],
): string {
  const parts: string[] = [];
  const lang = audio.language
    ? (dictLabel(LANGUAGES, audio.language) ?? audio.language)
    : null;
  if (lang) parts.push(lang);

  const format = formatAudioLabel(audio);
  if (format) {
    parts.push(format);
  } else if (audio.codec) {
    parts.push((codecShort(audio.codec) ?? audio.codec).toUpperCase());
  }

  if (audio.channelLayout && audio.channelLayout !== "other") {
    parts.push(audio.channelLayout);
  }

  const translation = translationShort(audio.translationType);
  if (translation) parts.push(translation);

  const bitrate = formatBitrateKbps(audio.bitrate);
  if (bitrate) parts.push(bitrate);

  return parts.join(" · ");
}

/** Second line under the track title: source specs + build flags. */
export function buildTrackDetailLine(
  track: SerializedTrack,
  sourceTrack: ReturnType<typeof resolveBuildSourceTrack>,
): string | null {
  const kind = normalizeBuildTrackKind(track.kind);
  let tech: string | null = null;

  if (kind === "video" && sourceTrack && "width" in sourceTrack) {
    tech = buildVideoTechLine(sourceTrack as NonNullable<ReleaseWithTracks["videoTrack"]>) || null;
  } else if (kind === "audio" && sourceTrack && "translationType" in sourceTrack) {
    tech = buildAudioTechLine(sourceTrack as ReleaseWithTracks["audioTracks"][number]) || null;
  }

  if (!tech && kind !== "subtitle") {
    tech = `stream ${track.sourceStreamIndex}`;
  }

  const flags = buildTrackFlags(track);
  const parts = [tech, ...flags].filter(Boolean);
  return parts.length > 0 ? parts.join(" · ") : null;
}

export function buildCompositionHeadline(tracks: SerializedTrack[]): string | null {
  const groups = groupBuildTracksByKind(tracks);
  if (groups.length === 0) return null;

  const parts = groups.map(({ kind, items }) => {
    const n = items.length;
    if (kind === "video") return `${n} ${n === 1 ? "видео" : "видео"}`;
    if (kind === "audio") {
      if (n === 1) return "1 аудио";
      if (n < 5) return `${n} аудио`;
      return `${n} аудио`;
    }
    if (n === 1) return "1 субтитр";
    if (n < 5) return `${n} субтитра`;
    return `${n} субтитров`;
  });

  return parts.join(" · ");
}

export function groupBuildTracksByKind(
  tracks: SerializedTrack[],
): { kind: BuildTrackKind; items: SerializedTrack[] }[] {
  const order: BuildTrackKind[] = ["video", "audio", "subtitle"];
  const buckets = new Map<BuildTrackKind, SerializedTrack[]>();

  for (const track of tracks) {
    const kind = normalizeBuildTrackKind(track.kind);
    const list = buckets.get(kind) ?? [];
    list.push(track);
    buckets.set(kind, list);
  }

  return order
    .filter((kind) => (buckets.get(kind)?.length ?? 0) > 0)
    .map((kind) => ({ kind, items: buckets.get(kind)! }));
}

export const BUILD_TRACK_KIND_SECTION: Record<
  BuildTrackKind,
  { title: string }
> = {
  video: { title: "Видео" },
  audio: { title: "Аудио" },
  subtitle: { title: "Субтитры" },
};
