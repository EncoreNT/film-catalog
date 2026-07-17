import type { SerializedBuild } from "@/lib/builds/build-serialize";
import { channelTargetLabel } from "@/lib/builds/build-presets";
import type { SpecTag } from "@/lib/builds/build-display";
import type { BuildTrackKind } from "@/lib/builds/build-recipe-state";
import {
  dictLabel,
  displayMovieVersionLabel,
  RELEASE_TYPES,
} from "@/lib/shared/dictionaries";
import { formatOffset } from "@/lib/builds/build-display";
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
  { title: string; hint?: string }
> = {
  video: { title: "Видео", hint: "Один поток, stream copy" },
  audio: { title: "Аудио", hint: "Копирование или перекодирование в AC-3/E-AC3" },
  subtitle: { title: "Субтитры" },
};
