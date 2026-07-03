"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  Check,
  Loader2,
  ScanSearch,
  Trash2,
} from "lucide-react";
import type { ReleaseWithTracks } from "@/lib/movies/movie-query";
import { Button } from "@/components/primitives/Button";
import { ConfirmDialog } from "@/components/primitives/ConfirmDialog";
import { Field } from "@/components/primitives/Field";
import { Select } from "@/components/primitives/Select";
import { DurationInput } from "@/components/primitives/DurationInput";
import { TrackEditorSection } from "@/components/shared/TrackEditorSection";
import { StoragePicker } from "@/components/shared/StoragePicker";
import { useStoragePicker } from "@/hooks/useStoragePicker";
import { useTrackEditor } from "@/hooks/useTrackEditor";
import type { VideoFieldState } from "@/lib/movies/movie-form-types";
import {
  buildReleaseUpdatePayload,
  type MovieFileMetaPayload,
} from "@/lib/movies/build-movie-payload";
import {
  DEFAULT_MOVIE_VERSION,
  MOVIE_VERSIONS,
  normalizeAudioProfile,
  RELEASE_TYPES,
} from "@/lib/shared/dictionaries";
import { trimOnInputBlur } from "@/lib/shared/text-trim";
import {
  applyProbeToTrackEditor,
  probeFilePath,
} from "@/lib/media/probe-from-file";
import { releaseTabLabel } from "@/lib/media/spec-tags";

interface ReleaseEditorBaseProps {
  movieId: number;
  movieSlug: string;
  movieTitle: string;
}

interface ReleaseEditorEditProps extends ReleaseEditorBaseProps {
  mode: "edit";
  release: ReleaseWithTracks;
}

interface ReleaseEditorCreateProps extends ReleaseEditorBaseProps {
  mode: "create";
  release?: never;
}

export type ReleaseEditorProps = ReleaseEditorEditProps | ReleaseEditorCreateProps;

function releaseToVideoState(release: ReleaseWithTracks | null): VideoFieldState {
  const v = release?.videoTrack;
  return {
    codec: v?.codec ?? "",
    hdr: v?.hdr ?? "SDR",
    resolutionLabel: v?.resolutionLabel ?? "",
    width: v?.width ?? null,
    height: v?.height ?? null,
    fps: v?.fps ?? "",
    bitrate: v?.bitrate ?? null,
  };
}

function useReleaseFormState(release: ReleaseWithTracks | null) {
  const {
    storageKind,
    setStorageKind,
    selectedStorageId,
    setSelectedStorageId,
    externalStorages,
    createExternalStorage,
    validateStorage,
    resolveExternalStorageId,
  } = useStoragePicker(release?.externalStorage ?? null);

  const [releaseType, setReleaseType] = useState(release?.releaseType ?? "");
  const [version, setVersion] = useState(
    release?.version ?? DEFAULT_MOVIE_VERSION,
  );
  const [filePath, setFilePath] = useState(release?.filePath ?? "");
  const [pendingFileMeta, setPendingFileMeta] =
    useState<MovieFileMetaPayload | null>(null);
  const [fillingFromFile, setFillingFromFile] = useState(false);
  const [fileFillError, setFileFillError] = useState<string | null>(null);
  const [fileFillMessage, setFileFillMessage] = useState<string | null>(null);
  const [durationSeconds, setDurationSeconds] = useState<number | null>(
    release?.durationSeconds ?? null,
  );
  const [video, setVideo] = useState<VideoFieldState>(() =>
    releaseToVideoState(release),
  );

  const trackEditor = useTrackEditor({
    initialAudio: (release?.audioTracks ?? []).map((track) => ({
      rowKey: `audio-${track.id}`,
      codec: track.codec ?? "",
      profile: normalizeAudioProfile(track.codec ?? "", track.profile ?? "None"),
      channelLayout: track.channelLayout ?? "",
      language: track.language ?? "",
      translationType: track.translationType ?? "",
      bitrate: track.bitrate,
      title: track.title ?? "",
      isDefault: track.isDefault,
    })),
    initialSubtitles: (release?.subtitleTracks ?? []).map((track) => ({
      rowKey: `sub-${track.id}`,
      codecLabel: track.codecLabel ?? "SRT",
      language: track.language ?? "",
      title: track.title ?? "",
      isDefault: track.isDefault,
      forced: track.forced,
    })),
    defaultAudioRow: () => ({
      rowKey: `audio-${crypto.randomUUID()}`,
      codec: "",
      profile: "None",
      channelLayout: "",
      language: "",
      translationType: "",
      bitrate: null,
      title: "",
      isDefault: false,
    }),
  });

  return {
    storageKind,
    setStorageKind,
    selectedStorageId,
    setSelectedStorageId,
    externalStorages,
    createExternalStorage,
    validateStorage,
    resolveExternalStorageId,
    releaseType,
    setReleaseType,
    version,
    setVersion,
    filePath,
    setFilePath,
    pendingFileMeta,
    setPendingFileMeta,
    fillingFromFile,
    setFillingFromFile,
    fileFillError,
    setFileFillError,
    fileFillMessage,
    setFileFillMessage,
    durationSeconds,
    setDurationSeconds,
    video,
    setVideo,
    ...trackEditor,
  };
}

export function ReleaseEditor(props: ReleaseEditorProps) {
  const { movieId, movieSlug, movieTitle, mode } = props;
  const release = mode === "edit" ? props.release : null;
  const router = useRouter();

  const form = useReleaseFormState(release);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const markDirty = () => setIsDirty(true);

  const handleFillFromFile = async () => {
    const trimmed = form.filePath.trim();
    if (!trimmed) {
      form.setFileFillError("Укажите путь к файлу");
      form.setFileFillMessage(null);
      return;
    }
    form.setFileFillError(null);
    form.setFillingFromFile(true);
    form.setFileFillMessage(null);
    try {
      const data = await probeFilePath(trimmed, { title: movieTitle || "probe" });
      applyProbeToTrackEditor(data, {
        setDurationSeconds: form.setDurationSeconds,
        setVideo: form.setVideo,
        setAudioRowsFromProbe: form.setAudioRowsFromProbe,
        setSubtitleRowsFromProbe: form.setSubtitleRowsFromProbe,
        setPendingFileMeta: form.setPendingFileMeta,
      });
      markDirty();
      form.setFileFillError(null);
      form.setFileFillMessage("Данные из файла заполнены — сохраните изменения");
      setTimeout(() => form.setFileFillMessage(null), 4000);
    } catch (err) {
      form.setFileFillError(
        err instanceof Error ? err.message : "Ошибка чтения файла",
      );
    } finally {
      form.setFillingFromFile(false);
    }
  };

  const buildPayload = async () => {
    const externalStorageId = await form.resolveExternalStorageId();
    return buildReleaseUpdatePayload({
      releaseType: form.releaseType,
      version: form.version,
      filePath: form.filePath,
      fileMeta: form.pendingFileMeta,
      externalStorageId,
      durationSeconds: form.durationSeconds,
      video: form.video,
      audioRows: form.audioRows,
      subtitleRows: form.subtitleRows,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const storageError = form.validateStorage();
    if (storageError) {
      setError(storageError);
      return;
    }

    setLoading(true);
    try {
      const payload = await buildPayload();

      if (mode === "edit" && release) {
        const res = await fetch(
          `/api/movies/${movieId}/releases/${release.id}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          },
        );
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error ?? "Ошибка сохранения релиза");
        }
        setIsDirty(false);
        form.setPendingFileMeta(null);
        form.setFileFillMessage(null);
        router.refresh();
      } else {
        const res = await fetch(`/api/movies/${movieId}/releases`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...payload, skipProbe: true }),
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error ?? "Не удалось создать релиз");
        }
        const created = (await res.json()) as ReleaseWithTracks;
        router.push(`/movies/${movieSlug}/releases/${created.id}/edit`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!release) return;
    setActionLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/movies/${movieId}/releases/${release.id}`,
        { method: "DELETE" },
      );
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Не удалось удалить релиз");
      }
      setConfirmDelete(false);
      router.push(`/movies/${movieSlug}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setActionLoading(false);
    }
  };

  const patchVideo = (patch: Partial<VideoFieldState>) => {
    form.setVideo((current) => ({ ...current, ...patch }));
    markDirty();
  };

  const patchAudio = (
    index: number,
    patch: Parameters<typeof form.updateAudio>[1],
  ) => {
    form.updateAudio(index, patch);
    markDirty();
  };

  const patchSubtitle = (
    index: number,
    patch: Parameters<typeof form.updateSubtitle>[1],
  ) => {
    form.updateSubtitle(index, patch);
    markDirty();
  };

  const releaseLabel =
    mode === "edit" && release ? releaseTabLabel(release) : "новый релиз";

  return (
    <form onSubmit={handleSubmit} className="pb-28">
      <div className="surface-card mb-6 space-y-5 p-5 sm:p-6">
        <h2 className="font-display text-xl font-semibold">
          Релиз · {releaseLabel}
        </h2>

        <StoragePicker
          compact
          storageKind={form.storageKind}
          onStorageKindChange={(value) => {
            form.setStorageKind(value);
            markDirty();
          }}
          externalStorages={form.externalStorages}
          selectedStorageId={form.selectedStorageId}
          onSelectedStorageIdChange={(value) => {
            form.setSelectedStorageId(value);
            markDirty();
          }}
          onCreateExternalStorage={async (name) => {
            await form.createExternalStorage(name);
            markDirty();
          }}
        />

        <Field
          label="Путь к файлу"
          placeholder="/Volumes/Seagate/Movies/film.mkv"
          hint="Абсолютный путь к видеофайлу."
        >
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
            <input
              id="путь-к-файлу"
              className={`focus-ring min-h-11 min-w-0 flex-1 rounded-[var(--radius)] border bg-bg-elevated px-3 py-2 text-sm text-text placeholder:text-muted/60 ${
                form.fileFillError ? "border-danger/50" : "border-border"
              }`}
              value={form.filePath}
              onChange={(e) => {
                form.setFilePath(e.target.value);
                form.setPendingFileMeta(null);
                form.setFileFillMessage(null);
                form.setFileFillError(null);
                markDirty();
              }}
              onBlur={(e) =>
                trimOnInputBlur(e, (ev) => {
                  form.setFilePath(ev.target.value);
                  form.setPendingFileMeta(null);
                  form.setFileFillMessage(null);
                  form.setFileFillError(null);
                })
              }
              aria-invalid={!!form.fileFillError}
              aria-describedby={
                form.fileFillError ? "file-path-fill-feedback" : undefined
              }
              placeholder="/Volumes/Seagate/Movies/film.mkv"
            />
            <Button
              type="button"
              variant="secondary"
              loading={form.fillingFromFile}
              onClick={handleFillFromFile}
              disabled={!form.filePath.trim() || form.fillingFromFile}
              className="shrink-0 sm:mt-0"
            >
              <ScanSearch className="h-4 w-4" aria-hidden />
              <span className="hidden sm:inline">Заполнить из файла</span>
              <span className="sm:hidden">Из файла</span>
            </Button>
          </div>
          <div id="file-path-fill-feedback" className="pt-1">
            {form.fileFillError ? (
              <p
                className="flex items-start gap-2 rounded-[var(--radius)] border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger"
                role="alert"
              >
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                <span>{form.fileFillError}</span>
              </p>
            ) : form.fileFillMessage ? (
              <p className="flex items-start gap-2 rounded-[var(--radius)] border border-accent/30 bg-accent/10 px-3 py-2 text-sm text-accent">
                <Check className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                <span>{form.fileFillMessage}</span>
              </p>
            ) : form.pendingFileMeta ? (
              <p className="text-xs text-accent">
                Метаданные файла готовы к сохранению
              </p>
            ) : form.filePath.trim() ? (
              <p className="text-xs text-faint">
                файл не проверялся — путь сохранится как указано
              </p>
            ) : (
              <p className="text-xs text-faint">
                не указан — будет сброшен при сохранении
              </p>
            )}
          </div>
        </Field>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_min(100%,320px)] lg:items-start lg:gap-8">
        <TrackEditorSection
          tabbed
          variant="balanced"
          videoColumnsOnXl
          audioGridCols="adaptive"
          video={form.video}
          onVideoChange={patchVideo}
          audioRows={form.audioRows}
          onUpdateAudio={patchAudio}
          onAddAudio={() => {
            form.addAudioRow();
            markDirty();
          }}
          onRemoveAudio={(index) => {
            form.removeAudioRow(index);
            markDirty();
          }}
          onSetMainAudio={(index) => {
            form.setMainAudioTrack(index);
            markDirty();
          }}
          subtitleRows={form.subtitleRows}
          onUpdateSubtitle={patchSubtitle}
          onAddSubtitle={() => {
            form.addSubtitleRow();
            markDirty();
          }}
          onRemoveSubtitle={(index) => {
            form.removeSubtitleRow(index);
            markDirty();
          }}
          mainTrackStyle="star"
          minAudioRows={0}
        />

        <aside className="surface-card space-y-5 p-5 sm:p-6 lg:sticky lg:top-24">
          <h2 className="font-display text-xl font-semibold">Параметры</h2>

          <DurationInput
            valueSeconds={form.durationSeconds}
            onChange={(s) => {
              form.setDurationSeconds(s);
              markDirty();
            }}
            hint="Из ffprobe при сканировании."
          />

          <Select
            label="Тип релиза"
            value={form.releaseType}
            onChange={(v) => {
              form.setReleaseType(v);
              markDirty();
            }}
            options={[{ value: "", label: "—" }, ...RELEASE_TYPES]}
            hint="BDRemux, BDRip, WEB-DL…"
          />
          <Select
            label="Версия"
            value={form.version}
            onChange={(v) => {
              form.setVersion(v);
              markDirty();
            }}
            options={MOVIE_VERSIONS}
            hint="Театральная, режиссёрская…"
          />
        </aside>
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-bg-deep/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-2.5">
            {loading || actionLoading ? (
              <>
                <Loader2 className="h-4 w-4 shrink-0 animate-spin text-accent" aria-hidden />
                <span className="font-mono-tech text-sm text-muted">
                  {actionLoading ? "выполнение…" : "сохранение…"}
                </span>
              </>
            ) : error ? (
              <span className="truncate text-sm text-danger" role="alert">
                {error}
              </span>
            ) : isDirty ? (
              <>
                <span className="h-2 w-2 shrink-0 rounded-full bg-accent shadow-[0_0_8px_var(--accent-glow)]" aria-hidden />
                <span className="font-mono-tech text-sm text-accent">
                  несохранённые изменения
                </span>
              </>
            ) : (
              <>
                <Check className="h-4 w-4 shrink-0 text-accent/70" aria-hidden />
                <span className="font-mono-tech text-sm text-muted">
                  все изменения сохранены
                </span>
              </>
            )}
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <Link
              href={`/movies/${movieSlug}`}
              className="focus-ring inline-flex min-h-11 items-center justify-center gap-2 rounded-[var(--radius)] border border-border-strong bg-bg-surface px-4 py-2 text-sm font-medium text-text transition-all duration-200 hover:border-accent/50 hover:bg-bg-surface-hover hover:text-accent"
            >
              Отмена
            </Link>
            {mode === "edit" && release ? (
              <Button
                type="button"
                variant="danger"
                onClick={() => setConfirmDelete(true)}
                disabled={loading || actionLoading}
              >
                <Trash2 className="h-4 w-4" aria-hidden />
                Удалить релиз
              </Button>
            ) : null}
            <Button
              type="submit"
              variant="primary"
              loading={loading}
              disabled={(mode === "edit" && !isDirty && !loading) || loading}
            >
              {mode === "create" ? "Создать релиз" : "Сохранить"}
            </Button>
          </div>
        </div>
      </div>

      {mode === "edit" ? (
        <ConfirmDialog
          open={confirmDelete}
          onClose={() => setConfirmDelete(false)}
          onConfirm={handleDelete}
          loading={actionLoading}
          title="Удалить релиз?"
          description="Релиз и все его дорожки будут удалены. Файл на диске не затрагивается."
          confirmLabel="Удалить"
        />
      ) : null}
    </form>
  );
}
