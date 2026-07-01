"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, EyeOff, Loader2, ScanSearch, Trash2, AlertCircle } from "lucide-react";
import type { MovieWithTracks } from "@/lib/movie-query";
import { Button } from "./primitives/Button";
import { ConfirmDialog } from "./primitives/ConfirmDialog";
import { Field, TextAreaField } from "./primitives/Field";
import { DatePicker } from "./primitives/DatePicker";
import { Select } from "./primitives/Select";
import { StarRating } from "./StarRating";
import { MovieFranchisePicker } from "./MovieFranchisePicker";
import type { MovieFranchiseMembership } from "@/lib/movie-franchise-memberships";
import { RELEASE_TYPES, GENRES, MOVIE_VERSIONS, DEFAULT_MOVIE_VERSION, normalizeAudioProfile } from "@/lib/dictionaries";
import { MultiSelect } from "./primitives/MultiSelect";
import { DurationInput } from "./primitives/DurationInput";
import { YearInput } from "./primitives/YearInput";
import { CoverUpload } from "./primitives/CoverUpload";
import { TrackEditorSection } from "./TrackEditorSection";
import { StoragePicker } from "./StoragePicker";
import { useStoragePicker } from "@/hooks/useStoragePicker";
import { useTrackEditor } from "@/hooks/useTrackEditor";
import type { VideoFieldState } from "@/lib/movie-form-types";
import {
  buildMovieUpdatePayload,
  type MovieFileMetaPayload,
} from "@/lib/build-movie-payload";
import type { ProbeResult } from "@/lib/ffprobe";
import {
  probeToAudioRows,
  probeToSubtitleRows,
  probeToVideoFields,
} from "@/lib/apply-probe";

interface MovieEditorProps {
  movie: MovieWithTracks;
  franchiseMemberships?: MovieFranchiseMembership[];
}

export function MovieEditor({ movie, franchiseMemberships }: MovieEditorProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [confirmKind, setConfirmKind] = useState<null | "hide" | "delete">(null);
  const [actionLoading, setActionLoading] = useState(false);

  // --- Movie fields ---
  const [title, setTitle] = useState(movie.title);
  const [year, setYear] = useState<number | null>(movie.year ?? null);
  const [description, setDescription] = useState(movie.description ?? "");
  const [releaseType, setReleaseType] = useState(movie.releaseType ?? "");
  const [version, setVersion] = useState(movie.version ?? DEFAULT_MOVIE_VERSION);
  const [filePath, setFilePath] = useState(movie.filePath ?? "");
  const [pendingFileMeta, setPendingFileMeta] =
    useState<MovieFileMetaPayload | null>(null);
  const [fillingFromFile, setFillingFromFile] = useState(false);
  const [fileFillError, setFileFillError] = useState<string | null>(null);
  const [fileFillMessage, setFileFillMessage] = useState<string | null>(null);
  const {
    storageKind,
    setStorageKind,
    selectedStorageId,
    setSelectedStorageId,
    newStorageName,
    setNewStorageName,
    externalStorages,
    validateStorage,
    resolveStorageId,
  } = useStoragePicker(movie.storage);
  const [genres, setGenres] = useState<string[]>(
    movie.genres.map((g) => g.name),
  );
  const [durationSeconds, setDurationSeconds] = useState<number | null>(
    movie.durationSeconds ?? null,
  );
  const [rating, setRating] = useState<number | null>(movie.rating);
  const [watchedAt, setWatchedAt] = useState(
    movie.watchedAt
      ? new Date(movie.watchedAt).toISOString().slice(0, 10)
      : "",
  );

  const v = movie.videoTrack;
  const [video, setVideo] = useState<VideoFieldState>({
    codec: v?.codec ?? "",
    hdr: v?.hdr ?? "SDR",
    resolutionLabel: v?.resolutionLabel ?? "",
    width: v?.width ?? null,
    height: v?.height ?? null,
    fps: v?.fps ?? "",
    bitrate: v?.bitrate ?? null,
  });

  const {
    audioRows,
    subtitleRows,
    updateAudio,
    addAudioRow,
    removeAudioRow,
    setMainAudioTrack,
    updateSubtitle,
    addSubtitleRow,
    removeSubtitleRow,
    setAudioRowsFromProbe,
    setSubtitleRowsFromProbe,
  } = useTrackEditor({
    initialAudio: movie.audioTracks.map((track) => ({
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
    initialSubtitles: movie.subtitleTracks.map((track) => ({
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

  const markDirty = () => setIsDirty(true);

  const applyProbeResult = (
    data: ProbeResult & Partial<MovieFileMetaPayload>,
  ) => {
    if (data.durationSeconds != null) {
      setDurationSeconds(data.durationSeconds);
    }
    setVideo((current) => ({ ...current, ...probeToVideoFields(data.video) }));
    if (data.audio.length) {
      setAudioRowsFromProbe(probeToAudioRows(data.audio));
    }
    if (data.subtitles.length) {
      setSubtitleRowsFromProbe(probeToSubtitleRows(data.subtitles));
    }
    if (
      data.fileSize != null &&
      data.fileMtime != null &&
      data.fileHash != null
    ) {
      setPendingFileMeta({
        fileSize: data.fileSize,
        fileMtime: data.fileMtime,
        fileHash: data.fileHash,
      });
    }
    markDirty();
    setFileFillError(null);
    setFileFillMessage("Данные из файла заполнены — сохраните изменения");
    setTimeout(() => setFileFillMessage(null), 4000);
  };

  const handleFillFromFile = async () => {
    const trimmed = filePath.trim();
    if (!trimmed) {
      setFileFillError("Укажите путь к файлу");
      setFileFillMessage(null);
      return;
    }
    setFileFillError(null);
    setFillingFromFile(true);
    setFileFillMessage(null);
    try {
      const res = await fetch("/api/movies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title || "probe",
          probeOnly: true,
          filePath: trimmed,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "Не удалось прочитать файл");
      }
      applyProbeResult(data);
    } catch (err) {
      setFileFillError(
        err instanceof Error ? err.message : "Ошибка чтения файла",
      );
    } finally {
      setFillingFromFile(false);
    }
  };

  const patchVideo = (patch: Partial<VideoFieldState>) => {
    setVideo((current) => ({ ...current, ...patch }));
    markDirty();
  };

  const patchAudio = (index: number, patch: Parameters<typeof updateAudio>[1]) => {
    updateAudio(index, patch);
    markDirty();
  };

  const patchSubtitle = (
    index: number,
    patch: Parameters<typeof updateSubtitle>[1],
  ) => {
    updateSubtitle(index, patch);
    markDirty();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const storageError = validateStorage();
    if (storageError) {
      setError(storageError);
      return;
    }

    setLoading(true);
    try {
      const storageId = await resolveStorageId();

      const res = await fetch(`/api/movies/${movie.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          buildMovieUpdatePayload({
            title,
            year,
            description,
            releaseType,
            version,
            filePath,
            fileMeta: pendingFileMeta,
            storageId,
            genres,
            durationSeconds,
            rating,
            watchedAt,
            video,
            audioRows,
            subtitleRows,
          }),
        ),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Ошибка сохранения");
      }
      const updated = (await res.json()) as MovieWithTracks;
      setIsDirty(false);
      setPendingFileMeta(null);
      setFileFillMessage(null);
      if (updated.slug !== movie.slug) {
        router.replace(`/movies/${updated.slug}/edit`);
      } else {
        router.refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    setLoading(true);
    try {
      await fetch(`/api/movies/${movie.id}/approve`, { method: "POST" });
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  const handleHide = async () => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/movies/${movie.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "EXCLUDED" }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Не удалось скрыть фильм");
      }
      setConfirmKind(null);
      router.push("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/movies/${movie.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Не удалось удалить фильм");
      }
      setConfirmKind(null);
      router.push("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8 pb-28">
      <div className="grid gap-8 lg:grid-cols-2">
        {/* Информация */}
        <div className="surface-card space-y-6 p-5">
          <h2 className="font-display text-xl font-semibold">Информация</h2>

          <div className="flex items-start gap-3">
            <CoverUpload
              movieId={movie.id}
              hasCover={!!movie.coverPath}
              coverVersion={movie.updatedAt}
              onUploaded={() => router.refresh()}
            />
            <div className="min-w-0 flex-1">
              <Field
                label="Название"
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  markDirty();
                }}
                required
              />
            </div>
          </div>

          <Field
            label="Путь к файлу"
            placeholder="/Volumes/Seagate/Movies/film.mkv"
            hint="Абсолютный путь к видеофайлу. Можно сохранить путь без доступного файла (например, внешний диск). Для чтения дорожек и метаданных нажмите «Заполнить данные из файла»."
          >
            <input
              id="путь-к-файлу"
              className={`focus-ring min-h-11 w-full rounded-[var(--radius)] border bg-bg-elevated px-3 py-2 text-sm text-text placeholder:text-muted/60 ${
                fileFillError ? "border-danger/50" : "border-border"
              }`}
              value={filePath}
              onChange={(e) => {
                setFilePath(e.target.value);
                setPendingFileMeta(null);
                setFileFillMessage(null);
                setFileFillError(null);
                markDirty();
              }}
              aria-invalid={!!fileFillError}
              aria-describedby={
                fileFillError ? "file-path-fill-feedback" : undefined
              }
              placeholder="/Volumes/Seagate/Movies/film.mkv"
            />
            <div className="space-y-2 pt-1">
              <Button
                type="button"
                variant="secondary"
                loading={fillingFromFile}
                onClick={handleFillFromFile}
                disabled={!filePath.trim() || fillingFromFile}
              >
                <ScanSearch className="h-4 w-4" aria-hidden />
                Заполнить данные из файла
              </Button>

              <div id="file-path-fill-feedback">
                {fileFillError ? (
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
                ) : pendingFileMeta ? (
                  <p className="text-xs text-accent">
                    Метаданные файла готовы к сохранению
                  </p>
                ) : filePath.trim() ? (
                  <p className="text-xs text-faint">
                    файл не проверялся — путь сохранится как указано
                  </p>
                ) : (
                  <p className="text-xs text-faint">
                    не указан — будет сброшен при сохранении
                  </p>
                )}
              </div>
            </div>
          </Field>

          <StoragePicker
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
            newStorageName={newStorageName}
            onNewStorageNameChange={(value) => {
              setNewStorageName(value);
              markDirty();
            }}
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <YearInput
              value={year}
              onChange={(y) => {
                setYear(y);
                markDirty();
              }}
              hint={`Год выхода фильма, от 1888 до текущего+1. Можно вводить цифрами или шагать кнопками.`}
            />
            <DurationInput
              valueSeconds={durationSeconds}
              onChange={(s) => {
                setDurationSeconds(s);
                markDirty();
              }}
              hint="Хранится в секундах. Переключайте формат справа: чч:мм:сс, минуты или секунды. При сканировании заполняется из ffprobe."
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
            hint="Источник копии: BDRemux, BDRip, WEB-DL, Blu-ray и т.д. Влияет на качество."
          />
          <Select
            label="Версия"
            value={version}
            onChange={(v) => {
              setVersion(v);
              markDirty();
            }}
            options={MOVIE_VERSIONS}
            hint="Монтажная версия фильма: театральная, режиссёрская, расширенная и т.д. Театральная — базовая, не отображается в каталоге."
          />
          <MultiSelect
            label="Жанры"
            value={genres}
            onChange={(g) => {
              setGenres(g);
              markDirty();
            }}
            options={GENRES}
            searchable
            hint="Можно выбрать несколько жанров. Используются для фильтрации в каталоге."
          />
          <TextAreaField
            label="Описание"
            value={description}
            onChange={(e) => {
              setDescription(e.target.value);
              markDirty();
            }}
            hint="Краткое описание сюжета — на твоё усмотрение."
          />

          <MovieFranchisePicker
            movieId={movie.id}
            movieTitle={movie.title}
            initialMemberships={franchiseMemberships ?? []}
          />

          <div className="space-y-2">
            <p className="text-sm text-muted">Оценка</p>
            <StarRating
              value={rating}
              onChange={(r) => {
                setRating(r);
                markDirty();
              }}
            />
          </div>

          <DatePicker
            label="Дата просмотра"
            value={watchedAt}
            onChange={(d) => {
              setWatchedAt(d);
              markDirty();
            }}
          />
        </div>

        <TrackEditorSection
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
          onSetMainAudio={(index) => {
            setMainAudioTrack(index);
            markDirty();
          }}
          subtitleRows={subtitleRows}
          onUpdateSubtitle={patchSubtitle}
          onAddSubtitle={() => {
            addSubtitleRow();
            markDirty();
          }}
          onRemoveSubtitle={(index) => {
            removeSubtitleRow(index);
            markDirty();
          }}
          mainTrackStyle="star"
          minAudioRows={0}
        />
      </div>

      {/* Sticky footer — единая точка сохранения */}
      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-bg-deep/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-2.5">
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 shrink-0 animate-spin text-accent" aria-hidden />
                <span className="font-mono-tech text-sm text-muted">сохранение…</span>
              </>
            ) : error ? (
              <span className="truncate text-sm text-danger" role="alert">
                {error}
              </span>
            ) : isDirty ? (
              <>
                <span className="h-2 w-2 shrink-0 rounded-full bg-accent shadow-[0_0_8px_var(--accent-glow)]" aria-hidden />
                <span className="font-mono-tech text-sm text-accent">несохранённые изменения</span>
              </>
            ) : (
              <>
                <Check className="h-4 w-4 shrink-0 text-accent/70" aria-hidden />
                <span className="font-mono-tech text-sm text-muted">все изменения сохранены</span>
              </>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {movie.status === "DRAFT" ? (
              <Button
                type="button"
                variant="secondary"
                loading={loading}
                onClick={handleApprove}
              >
                В каталог
              </Button>
            ) : null}
            {movie.status !== "EXCLUDED" ? (
              <Button
                type="button"
                variant="secondary"
                onClick={() => setConfirmKind("hide")}
                disabled={loading || actionLoading}
              >
                <EyeOff className="h-4 w-4" aria-hidden />
                Скрыть
              </Button>
            ) : null}
            <Button
              type="button"
              variant="danger"
              onClick={() => setConfirmKind("delete")}
              disabled={loading || actionLoading}
            >
              <Trash2 className="h-4 w-4" aria-hidden />
              Удалить
            </Button>
            <Button
              type="submit"
              variant="primary"
              loading={loading}
              disabled={!isDirty && !loading}
            >
              Сохранить
            </Button>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={confirmKind === "hide"}
        onClose={() => setConfirmKind(null)}
        onConfirm={handleHide}
        loading={actionLoading}
        title="Скрыть фильм из каталога?"
        description="Фильм пропадёт из каталога, но останется в базе — его можно будет вернуть. Текущие несохранённые правки не будут сохранены."
        confirmLabel="Скрыть"
      />
      <ConfirmDialog
        open={confirmKind === "delete"}
        onClose={() => setConfirmKind(null)}
        onConfirm={handleDelete}
        loading={actionLoading}
        title="Удалить фильм безвозвратно?"
        description="Фильм и все его дорожки будут удалены из базы навсегда. Это действие нельзя отменить. Текущие несохранённые правки будут потеряны."
        confirmLabel="Удалить навсегда"
      />
    </form>
  );
}
