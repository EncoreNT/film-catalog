"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertCircle, Check, ScanSearch, Trash2 } from "lucide-react";
import type { ReleaseWithTracks } from "@/lib/movies/movie-include";
import { Button } from "@/components/primitives/Button";
import { ConfirmDialog } from "@/components/primitives/ConfirmDialog";
import { FormActionBar } from "@/components/primitives/FormActionBar";
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
  validateAudioProfileForCodec,
  RELEASE_TYPES,
} from "@/lib/shared/dictionaries";
import { trimOnInputBlur } from "@/lib/shared/text-trim";
import {
  commitFilePathInput,
  FILE_PATH_INPUT_HINT,
  formatFilePathInput,
  normalizeFilePathInput,
} from "@/lib/shared/display-path";
import {
  applyParsedFilePathFields,
  applyProbeToTrackEditor,
  probeFilePath,
} from "@/hooks/useProbeFile";

import { SpotlightTier } from "@/components/layout/SpotlightTier";
import { releaseFormTier } from "@/lib/releases/release-form-tier";
import { formatBytes } from "@/lib/shared/format-bytes";
import { apiFetch } from "@/lib/api/client";

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

export type ReleaseEditorProps =
  ReleaseEditorEditProps | ReleaseEditorCreateProps;

function releaseToVideoState(
  release: ReleaseWithTracks | null,
): VideoFieldState {
  const v = release?.videoTrack;
  return {
    codec: v?.codec ?? "",
    hdr: v?.hdr ?? "SDR",
    hasHdr10Plus: v?.hasHdr10Plus ?? false,
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
    refreshStorages,
    createExternalStorage,
    validateStorage,
    resolveExternalStorageId,
  } = useStoragePicker(release?.externalStorage ?? null);

  const [releaseType, setReleaseType] = useState(release?.releaseType ?? "");
  const [version, setVersion] = useState(
    release?.version ?? DEFAULT_MOVIE_VERSION,
  );
  const [filePath, setFilePath] = useState(() =>
    formatFilePathInput(release?.filePath ?? ""),
  );
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
      profile: validateAudioProfileForCodec(
        track.codec ?? "",
        track.profile ?? "None",
      ),
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
    refreshStorages,
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
  const [confirmReread, setConfirmReread] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const [readFile, setReadFile] = useState(() => ({
    path: normalizeFilePathInput(release?.filePath ?? ""),
    size: release?.fileSize ?? null,
  }));
  const tier = releaseFormTier(form.video, form.audioRows);
  const fileSizeLabel =
    !form.fileFillError &&
    readFile.path &&
    readFile.path === normalizeFilePathInput(form.filePath)
      ? formatBytes(readFile.size)
      : null;
  const markDirty = () => setIsDirty(true);

  const handleFillFromFile = async () => {
    const runtime = normalizeFilePathInput(form.filePath);
    if (!runtime) {
      form.setFileFillError("Укажите путь к файлу");
      form.setFileFillMessage(null);
      return;
    }
    form.setFileFillError(null);
    form.setFillingFromFile(true);
    form.setFileFillMessage(null);
    try {
      const { display } = commitFilePathInput(form.filePath);
      form.setFilePath(display);
      const data = await probeFilePath(runtime, {
        title: movieTitle || "probe",
      });
      setReadFile({ path: runtime, size: data.fileSize ?? null });
      const parsed = applyParsedFilePathFields(runtime, {
        releaseType: form.releaseType,
        setReleaseType: form.setReleaseType,
      });
      if (mode === "edit") form.setReleaseType(parsed.releaseType ?? "");
      applyProbeToTrackEditor(data, {
        setDurationSeconds: form.setDurationSeconds,
        setVideo: form.setVideo,
        setAudioRowsFromProbe: form.setAudioRowsFromProbe,
        setSubtitleRowsFromProbe: form.setSubtitleRowsFromProbe,
        setPendingFileMeta: form.setPendingFileMeta,
      });
      markDirty();
      form.setFileFillError(null);
      form.setFileFillMessage("Данные из файла заполнены. Сохраните изменения");
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
      filePath: normalizeFilePathInput(form.filePath),
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
        await apiFetch(
          `/api/movies/${movieId}/releases/${release.id}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          },
          "Ошибка сохранения релиза",
        );
        setIsDirty(false);
        form.setPendingFileMeta(null);
        form.setFileFillMessage(null);
        void form.refreshStorages();
        router.refresh();
      } else {
        const created = await apiFetch<ReleaseWithTracks>(
          `/api/movies/${movieId}/releases`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...payload, skipProbe: true }),
          },
          "Не удалось создать релиз",
        );
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
      const result = await apiFetch<{ movieDeleted?: boolean }>(
        `/api/movies/${movieId}/releases/${release.id}`,
        { method: "DELETE" },
        "Не удалось удалить релиз",
      );
      setConfirmDelete(false);
      router.push(result.movieDeleted ? "/" : `/movies/${movieSlug}`);
      router.refresh();
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

  const sourceCard = (
    <section className="release-editor-section release-source-section space-y-5">
      <div className="release-editor-section-heading">
        <h2>Файл и хранилище</h2>
        <p>Укажите файл, чтобы заполнить параметры и дорожки.</p>
      </div>

      <StoragePicker
        compact
        fullWidth
        showUsage
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
        placeholder="D:\Movies\film.mkv или /mnt/d/Movies/film.mkv"
        hint={FILE_PATH_INPUT_HINT}
      >
        <div className="flex flex-col gap-2">
          <input
            id="путь-к-файлу"
            className={`focus-ring min-h-11 min-w-0 w-full rounded-[var(--radius)] border bg-bg-elevated px-3 py-2 text-sm text-text placeholder:text-muted/60 ${
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
                const trimmed = ev.target.value.trim();
                if (!trimmed) {
                  form.setFilePath("");
                } else {
                  form.setFilePath(commitFilePathInput(trimmed).display);
                }
              })
            }
            aria-invalid={!!form.fileFillError}
            aria-describedby={
              form.fileFillError ? "file-path-fill-feedback" : undefined
            }
            placeholder="D:\Movies\film.mkv или /mnt/d/Movies/film.mkv"
          />
          <Button
            type="button"
            variant="secondary"
            loading={form.fillingFromFile}
            onClick={() => {
              if (mode === "edit") setConfirmReread(true);
              else void handleFillFromFile();
            }}
            disabled={!form.filePath.trim() || form.fillingFromFile}
            className="w-full"
          >
            <ScanSearch className="h-4 w-4" aria-hidden />
            {mode === "edit" ? "Перечитать из файла" : "Заполнить из файла"}
          </Button>
        </div>
        <div id="file-path-fill-feedback" className="pt-1">
          {fileSizeLabel ? (
            <p className="release-file-size">
              <span>Размер файла</span>
              <strong>{fileSizeLabel}</strong>
            </p>
          ) : null}
          {form.fileFillError ? (
            <p
              className="flex items-start gap-2 rounded-[var(--radius)] border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger"
              role="alert"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              <span>{form.fileFillError}</span>
            </p>
          ) : form.fileFillMessage ? (
            <p
              role="status"
              className="flex items-start gap-2 rounded-[var(--radius)] border border-accent/30 bg-accent/10 px-3 py-2 text-sm text-accent"
            >
              <Check className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              <span>{form.fileFillMessage}</span>
            </p>
          ) : form.pendingFileMeta ? (
            <p className="text-xs text-accent">
              Метаданные файла готовы к сохранению
            </p>
          ) : fileSizeLabel ? null : form.filePath.trim() ? (
            <p className="text-xs text-faint">
              Заполните данные из файла или укажите параметры вручную.
            </p>
          ) : (
            <p className="text-xs text-faint">
              Можно заполнить параметры вручную без файла.
            </p>
          )}
        </div>
      </Field>
    </section>
  );

  const detailsCard = (
    <section className="release-editor-section release-identity-section space-y-5">
      <div className="release-editor-section-heading">
        <h2>Параметры релиза</h2>
      </div>

      <DurationInput
        valueSeconds={form.durationSeconds}
        onChange={(s) => {
          form.setDurationSeconds(s);
          markDirty();
        }}
        hint="Заполняется из файла. При необходимости время можно изменить вручную."
      />

      <Select
        label="Тип релиза"
        value={form.releaseType}
        onChange={(v) => {
          form.setReleaseType(v);
          markDirty();
        }}
        options={[{ value: "", label: "Не указан" }, ...RELEASE_TYPES]}
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
        preserveOrder
        hint="Театральная, режиссёрская, детская…"
      />
    </section>
  );

  return (
    <form
      onSubmit={handleSubmit}
      className="release-editor-form"
      data-tier={tier ?? "general"}
    >
      <SpotlightTier tier={tier ?? "general"} />
      <fieldset
        disabled={loading || actionLoading || form.fillingFromFile}
        className="release-editor-grid"
      >
        <div className="release-editor-source">
          {sourceCard}
          {detailsCard}
        </div>

        <div className="release-editor-tracks">
          <TrackEditorSection
            tabbed
            layout="editor"
            variant="balanced"
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
        </div>
      </fieldset>

      <FormActionBar
        isDirty={isDirty}
        saving={loading}
        actionLoading={actionLoading}
        error={error}
        idleMessage={mode === "create" && !isDirty ? "Новый релиз" : undefined}
        secondaryActions={
          mode === "edit" ? (
            <Button
              type="button"
              variant="ghost"
              onClick={() => setConfirmDelete(true)}
              disabled={loading || actionLoading || form.fillingFromFile}
              className="text-danger"
            >
              <Trash2 className="h-4 w-4" aria-hidden />
              Удалить релиз
            </Button>
          ) : undefined
        }
      >
        <Link
          href={`/movies/${movieSlug}`}
          className="focus-ring inline-flex min-h-11 items-center justify-center gap-2 rounded-[var(--radius)] border border-border-strong bg-bg-surface px-4 py-2 text-sm font-medium text-text transition-all duration-200 hover:border-accent/50 hover:bg-bg-surface-hover hover:text-accent"
        >
          Отмена
        </Link>
        <Button
          type="submit"
          variant="primary"
          loading={loading}
          disabled={
            (mode === "edit" && !isDirty) ||
            loading ||
            actionLoading ||
            form.fillingFromFile
          }
        >
          {mode === "create" ? "Создать релиз" : "Сохранить"}
        </Button>
      </FormActionBar>

      <ConfirmDialog
        open={confirmReread}
        onClose={() => setConfirmReread(false)}
        onConfirm={() => {
          setConfirmReread(false);
          void handleFillFromFile();
        }}
        title="Перечитать данные из файла?"
        description="Продолжительность, тип релиза, параметры видео, аудиодорожки и субтитры будут заполнены заново. Текущие значения этих полей, включая ручные правки, будут заменены. Чтобы записать результат в каталог, нажмите «Сохранить»."
        confirmLabel="Перечитать"
        tone="accent"
      />

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
