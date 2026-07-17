"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  Check,
  FileVideo,
  Loader2,
  ScanSearch,
} from "lucide-react";
import { Button } from "@/components/primitives/Button";
import { Field, TextAreaField } from "@/components/primitives/Field";
import { Select } from "@/components/primitives/Select";
import { FormActionBar } from "@/components/primitives/FormActionBar";
import { MachinedCard, CardSectionHeader } from "@/components/primitives/MachinedCard";
import { StoragePicker } from "@/components/shared/StoragePicker";
import { TrackEditorSection } from "@/components/shared/TrackEditorSection";
import { GenrePicker } from "@/components/movies/GenrePicker";
import { DurationInput } from "@/components/primitives/DurationInput";
import { YearInput } from "@/components/primitives/YearInput";
import { CoverUpload } from "@/components/primitives/CoverUpload";
import { useFilePathCheck } from "@/hooks/useFilePathCheck";
import { useTrackEditor } from "@/hooks/useTrackEditor";
import type { VideoFieldState } from "@/lib/movies/movie-form-types";
import { emptyAudioFormRow } from "@/lib/movies/movie-form-types";
import {
  applyParsedFilePathFields,
  applyProbeToTrackEditor,
  probeFilePath,
} from "@/hooks/useProbeFile";
import { buildMovieCreatePayload } from "@/lib/movies/build-movie-payload";
import { apiFetch, uploadCoverAfterCreate } from "@/lib/api/client";
import { useStoragePicker } from "@/hooks/useStoragePicker";
import { RELEASE_TYPES } from "@/lib/shared/dictionaries";
import {
  commitFilePathInput,
  FILE_PATH_INPUT_HINT,
  normalizeFilePathInput,
} from "@/lib/shared/display-path";
import { trimOnInputBlur } from "@/lib/shared/text-trim";

export function AddMovieForm() {
  const router = useRouter();
  const [isDirty, setIsDirty] = useState(false);
  const markDirty = () => setIsDirty(true);

  const [title, setTitle] = useState("");
  const [year, setYear] = useState<number | null>(null);
  const [description, setDescription] = useState("");
  const [filePath, setFilePath] = useState("");
  const { checking, exists: fileExists, checkFilePath } = useFilePathCheck();
  const [autoFilling, setAutoFilling] = useState(false);
  const [fileFillError, setFileFillError] = useState<string | null>(null);
  const [fileFillMessage, setFileFillMessage] = useState<string | null>(null);

  const {
    storageKind,
    setStorageKind,
    selectedStorageId,
    setSelectedStorageId,
    externalStorages,
    createExternalStorage,
    validateStorage,
    resolveExternalStorageId,
  } = useStoragePicker();

  const [releaseType, setReleaseType] = useState("");
  const [genres, setGenres] = useState<string[]>([]);
  const [durationSeconds, setDurationSeconds] = useState<number | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [video, setVideo] = useState<VideoFieldState>({
    codec: "",
    hdr: "SDR",
    resolutionLabel: "",
    width: null,
    height: null,
    fps: "",
    bitrate: null,
  });

  const {
    audioRows,
    subtitleRows: subRows,
    updateAudio,
    addAudioRow,
    removeAudioRow,
    updateSubtitle: updateSub,
    addSubtitleRow: addSubRow,
    removeSubtitleRow: removeSubRow,
    setAudioRowsFromProbe,
    setSubtitleRowsFromProbe,
  } = useTrackEditor({
    initialAudio: [emptyAudioFormRow({ isDefault: true })],
    defaultAudioRow: () => emptyAudioFormRow({ isDefault: false }),
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFilePathBlur = () => {
    const trimmed = filePath.trim();
    if (!trimmed) return;
    const { display, runtime } = commitFilePathInput(trimmed);
    setFilePath(display);
    applyParsedFilePathFields(runtime, {
      title,
      year,
      releaseType,
      setTitle,
      setYear,
      setReleaseType,
    });
    markDirty();
    void checkFilePath(display);
  };

  const handleAutoFill = async () => {
    const runtime = normalizeFilePathInput(filePath);
    if (!runtime) {
      setFileFillError("Укажите путь к файлу для автозаполнения");
      return;
    }
    setFileFillError(null);
    setAutoFilling(true);
    try {
      const { display } = commitFilePathInput(filePath);
      setFilePath(display);
      applyParsedFilePathFields(runtime, {
        title,
        year,
        releaseType,
        setTitle,
        setYear,
        setReleaseType,
      });
      const data = await probeFilePath(runtime, { title: title || "probe" });
      applyProbeToTrackEditor(data, {
        setDurationSeconds,
        setVideo,
        setAudioRowsFromProbe,
        setSubtitleRowsFromProbe,
      });
      markDirty();
      setFileFillMessage("Данные из файла заполнены — проверьте дорожки справа");
      setTimeout(() => setFileFillMessage(null), 4000);
    } catch (err) {
      setFileFillError(
        err instanceof Error ? err.message : "Ошибка автозаполнения",
      );
    } finally {
      setAutoFilling(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!title.trim()) {
      setError("Укажите название");
      return;
    }
    const storageError = validateStorage();
    if (storageError) {
      setError(storageError);
      return;
    }

    setLoading(true);
    try {
      const externalStorageId = await resolveExternalStorageId();

      const payload = buildMovieCreatePayload({
        title,
        year,
        description: description.trim() || null,
        externalStorageId,
        releaseType: releaseType || null,
        genres,
        durationSeconds,
        filePath: normalizeFilePathInput(filePath) ?? null,
        video,
        audioRows,
        subtitleRows: subRows,
      });

      const movie = await apiFetch<{ id: number; slug: string }>(
        "/api/movies",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
        "Ошибка добавления",
      );
      await uploadCoverAfterCreate(
        `/api/movies/${movie.id}/cover`,
        coverFile,
        coverUrl,
      );
      router.push(`/movies/${movie.slug}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setLoading(false);
    }
  };

  const patchVideo = (patch: Partial<VideoFieldState>) => {
    setVideo((current) => ({ ...current, ...patch }));
    markDirty();
  };

  const patchAudio = (
    index: number,
    patch: Parameters<typeof updateAudio>[1],
  ) => {
    updateAudio(index, patch);
    markDirty();
  };

  const patchSubtitle = (
    index: number,
    patch: Parameters<typeof updateSub>[1],
  ) => {
    updateSub(index, patch);
    markDirty();
  };

  const cardSection = (
    <MachinedCard variant="calm" bodyClassName="space-y-5">
      <CardSectionHeader label="основное" title="Карточка" />
      <div className="flex flex-col gap-5">
        <CoverUpload
          layout="stacked"
          onFileChange={(file) => {
            setCoverFile(file);
            markDirty();
          }}
          onUrlChange={(url) => {
            setCoverUrl(url);
            markDirty();
          }}
        />
        <Field
          label="Название"
          variant="underline"
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            markDirty();
          }}
          required
          placeholder="Например, Криминальное чтиво"
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <YearInput
            value={year}
            onChange={(y) => {
              setYear(y);
              markDirty();
            }}
            hint="Год выхода, 1888 — текущий+1."
          />
          <DurationInput
            valueSeconds={durationSeconds}
            onChange={(s) => {
              setDurationSeconds(s);
              markDirty();
            }}
            hint="Из ffprobe при автозаполнении или вручную."
          />
        </div>
        <Select
          label="Тип релиза"
          value={releaseType}
          onChange={(v) => {
            setReleaseType(v);
            markDirty();
          }}
          options={[{ value: "", label: "—" }, ...RELEASE_TYPES]}
          hint="BDRemux, BDRip, WEB-DL…"
        />
        <GenrePicker
          value={genres}
          onChange={(g) => {
            setGenres(g);
            markDirty();
          }}
        />
        <TextAreaField
          label="Описание"
          variant="underline"
          value={description}
          onChange={(e) => {
            setDescription(e.target.value);
            markDirty();
          }}
          placeholder="Краткое описание фильма…"
          hint="Краткое описание сюжета — на твоё усмотрение."
          rows={4}
        />
      </div>
    </MachinedCard>
  );

  const sourceSection = (
    <MachinedCard variant="calm" bodyClassName="space-y-5">
      <CardSectionHeader label="хранилище" title="Источник файла" />

      <StoragePicker
        compact
        storageKind={storageKind}
        onStorageKindChange={(value) => {
          setStorageKind(value);
          markDirty();
        }}
        externalStorages={externalStorages}
        selectedStorageId={selectedStorageId}
        onSelectedStorageIdChange={(value) => {
          setSelectedStorageId(value);
          markDirty();
        }}
        onCreateExternalStorage={async (name) => {
          await createExternalStorage(name);
          markDirty();
        }}
      />

      <Field
        label="Путь к файлу (опционально)"
        placeholder="D:\Movies\film.mkv или /mnt/d/Movies/film.mkv"
        hint={FILE_PATH_INPUT_HINT}
      >
        <input
          id="add-movie-file-path"
          className="focus-ring min-h-11 min-w-0 w-full rounded-[var(--radius)] border border-border bg-bg-elevated px-3 py-2 text-sm text-text placeholder:text-muted/60"
          value={filePath}
          onChange={(e) => {
            setFilePath(e.target.value);
            setFileFillError(null);
            setFileFillMessage(null);
            markDirty();
          }}
          onBlur={(e) =>
            trimOnInputBlur(e, () => {
              handleFilePathBlur();
            })
          }
          aria-describedby="add-movie-file-path-feedback"
          placeholder="D:\Movies\film.mkv или /mnt/d/Movies/film.mkv"
        />
        <div id="add-movie-file-path-feedback" className="pt-1">
          {filePath.trim() ? (
            <p className="flex items-center gap-2 text-xs text-muted">
              {checking ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-accent" />
              ) : fileExists ? (
                <Check className="h-3.5 w-3.5 text-accent" />
              ) : (
                <FileVideo className="h-3.5 w-3.5 text-faint" />
              )}
              {checking
                ? "Проверяю файл…"
                : fileExists
                  ? "Файл доступен"
                  : "Файл не найден — можно заполнить вручную"}
            </p>
          ) : (
            <p className="text-xs text-faint">
              Без пути фильм сохранится как карточка без привязки к файлу
            </p>
          )}
        </div>
      </Field>
    </MachinedCard>
  );

  return (
    <form
      onSubmit={handleSubmit}
      className="flex h-full min-h-0 flex-col pb-28 lg:pb-0"
    >
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-6 overflow-hidden lg:grid-cols-3 lg:gap-8">
        <div className="flex flex-col gap-6 lg:col-span-1 lg:min-h-0 lg:overflow-y-auto lg:pr-1 scroll-subtle">
          {cardSection}
          {sourceSection}
        </div>

        <div className="flex h-full min-h-0 flex-col overflow-hidden lg:col-span-2">
          <TrackEditorSection
            tabbed
            layout="panel"
            variant="balanced"
            videoColumnsOnXl
            audioGridCols="adaptive"
            headerTrailing={
              <Button
                type="button"
                variant="secondary"
                loading={autoFilling}
                onClick={handleAutoFill}
                disabled={!filePath.trim() || autoFilling}
                className="ml-auto min-h-9 shrink-0 px-3 py-1.5"
              >
                <ScanSearch className="h-4 w-4" aria-hidden />
                Заполнить из файла
              </Button>
            }
            notice={
              fileFillError ? (
                <p
                  className="flex items-start gap-2 rounded-[var(--radius)] border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger"
                  role="alert"
                >
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                  <span>{fileFillError}</span>
                </p>
              ) : fileFillMessage ? (
                <p className="flex items-start gap-2 rounded-[var(--radius)] border border-accent/30 bg-accent/10 px-3 py-2 text-sm text-accent">
                  <Check className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                  <span>{fileFillMessage}</span>
                </p>
              ) : null
            }
            video={video}
            onVideoChange={patchVideo}
            audioRows={audioRows}
            onUpdateAudio={patchAudio}
            onAddAudio={() => {
              addAudioRow();
              markDirty();
            }}
            onRemoveAudio={(index) => {
              removeAudioRow(index);
              markDirty();
            }}
            subtitleRows={subRows}
            onUpdateSubtitle={patchSubtitle}
            onAddSubtitle={() => {
              addSubRow();
              markDirty();
            }}
            onRemoveSubtitle={(index) => {
              removeSubRow(index);
              markDirty();
            }}
            mainTrackStyle="star"
            minAudioRows={0}
            emptySubtitleMessage="Субтитров нет"
          />
        </div>
      </div>

      <FormActionBar
        isDirty={isDirty}
        saving={loading}
        error={error}
        idleMessage={
          !isDirty && !loading && !error
            ? "Заполните карточку или укажите файл для автозаполнения"
            : undefined
        }
      >
        <Link
          href="/"
          className="focus-ring inline-flex min-h-11 items-center justify-center gap-2 rounded-[var(--radius)] border border-border-strong bg-bg-surface px-4 py-2 text-sm font-medium text-text transition-all duration-200 hover:border-accent/50 hover:bg-bg-surface-hover hover:text-accent"
        >
          Отмена
        </Link>
        <Button type="submit" variant="primary" loading={loading}>
          Добавить в каталог
        </Button>
      </FormActionBar>
    </form>
  );
}
