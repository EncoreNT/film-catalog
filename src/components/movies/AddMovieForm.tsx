"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import {
  Sparkles,
  Plus,
  ChevronRight,
  ChevronLeft,
  Check,
  Music,
  Subtitles,
  Clapperboard,
  Loader2,
  FileVideo,
  ScanSearch,
} from "lucide-react";
import { Button } from "@/components/primitives/Button";
import { Field, TextAreaField } from "@/components/primitives/Field";
import { Select } from "@/components/primitives/Select";
import { StoragePicker } from "@/components/shared/StoragePicker";
import {
  RELEASE_TYPES,
} from "@/lib/shared/dictionaries";
import { GenrePicker } from "@/components/movies/GenrePicker";
import { DurationInput } from "@/components/primitives/DurationInput";
import { YearInput } from "@/components/primitives/YearInput";
import { CoverUpload } from "@/components/primitives/CoverUpload";
import { TrackEditorSection } from "@/components/shared/TrackEditorSection";
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

interface AddMovieFormProps {
  onDone?: () => void;
}

const STEPS: { key: string; label: string; icon: React.ReactNode }[] = [
  { key: "details", label: "Детали", icon: <Sparkles className="h-4 w-4" /> },
  { key: "video", label: "Видео", icon: <Clapperboard className="h-4 w-4" /> },
  { key: "audio", label: "Аудио", icon: <Music className="h-4 w-4" /> },
  { key: "subs", label: "Субтитры", icon: <Subtitles className="h-4 w-4" /> },
];

export function AddMovieForm({ onDone }: AddMovieFormProps) {
  const router = useRouter();
  const [step, setStep] = useState(0);

  const [title, setTitle] = useState("");
  const [year, setYear] = useState<number | null>(null);
  const [description, setDescription] = useState("");
  const [filePath, setFilePath] = useState("");
  const { checking, exists: fileExists, checkFilePath } = useFilePathCheck();
  const [autoFilling, setAutoFilling] = useState(false);
  const [autoFilled, setAutoFilled] = useState(false);

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
    applyParsedFilePathFields(trimmed, {
      title,
      year,
      releaseType,
      setTitle,
      setYear,
      setReleaseType,
    });
    void checkFilePath(trimmed);
  };

  const handleAutoFill = async () => {
    if (!filePath.trim()) {
      setError("Укажите путь к файлу для автозаполнения");
      return;
    }
    setError(null);
    setAutoFilling(true);
    try {
      const trimmed = filePath.trim();
      applyParsedFilePathFields(trimmed, {
        title,
        year,
        releaseType,
        setTitle,
        setYear,
        setReleaseType,
      });
      const data = await probeFilePath(trimmed, { title: title || "probe" });
      applyProbeToTrackEditor(data, {
        setDurationSeconds,
        setVideo,
        setAudioRowsFromProbe,
        setSubtitleRowsFromProbe,
      });
      setAutoFilled(true);
      setTimeout(() => setAutoFilled(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка автозаполнения");
    } finally {
      setAutoFilling(false);
    }
  };

  const handleSubmit = async () => {
    setError(null);
    if (!title.trim()) {
      setError("Укажите название");
      setStep(0);
      return;
    }
    const storageError = validateStorage();
    if (storageError) {
      setError(storageError);
      setStep(0);
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
        filePath: filePath.trim() || null,
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
      onDone?.();
      router.push(`/movies/${movie.slug}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setLoading(false);
    }
  };

  const canNext = step < STEPS.length - 1;
  const canBack = step > 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-1 overflow-x-auto pb-1">
        {STEPS.map((s, i) => {
          const active = i === step;
          const done = i < step;
          return (
            <button
              key={s.key}
              type="button"
              onClick={() => setStep(i)}
              className={`focus-ring flex shrink-0 items-center gap-2 rounded-full border px-3 py-1.5 text-xs transition-all duration-200 ${
                active
                  ? "border-accent/50 bg-accent/10 text-accent"
                  : done
                    ? "border-border-strong text-text"
                    : "border-border text-faint hover:text-muted"
              }`}
              aria-current={active ? "step" : undefined}
            >
              {done ? <Check className="h-3.5 w-3.5" /> : s.icon}
              <span className="font-mono-tech">{s.label}</span>
            </button>
          );
        })}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 12 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -12 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        >
          {step === 0 ? (
            <div className="space-y-5">
              <DetailsFields
                title={title}
                setTitle={setTitle}
                year={year}
                setYear={setYear}
                durationSeconds={durationSeconds}
                setDurationSeconds={setDurationSeconds}
                releaseType={releaseType}
                setReleaseType={setReleaseType}
                genres={genres}
                setGenres={setGenres}
                description={description}
                setDescription={setDescription}
                setCoverFile={setCoverFile}
                setCoverUrl={setCoverUrl}
              />

              <StoragePicker
                storageKind={storageKind}
                onStorageKindChange={setStorageKind}
                externalStorages={externalStorages}
                selectedStorageId={selectedStorageId}
                onSelectedStorageIdChange={setSelectedStorageId}
                onCreateExternalStorage={createExternalStorage}
              />

              <div className="space-y-3">
                <Field
                  label="Путь к файлу (опционально)"
                  value={filePath}
                  onChange={(e) => setFilePath(e.target.value)}
                  onBlur={handleFilePathBlur}
                  placeholder="/Volumes/Seagate/Movies/film.mkv"
                  hint="Абсолютный путь к видеофайлу. Укажите даже для внешнего диска, если он подключён — «Автозаполнить» прочитает техданные через ffprobe."
                />
                <div className="flex flex-wrap items-center gap-3">
                  <Button
                    variant="secondary"
                    loading={autoFilling}
                    onClick={handleAutoFill}
                    disabled={!filePath.trim()}
                  >
                    <ScanSearch className="h-4 w-4" />
                    Автозаполнить из файла
                  </Button>
                  {filePath.trim() ? (
                    <span className="flex items-center gap-2 text-sm text-muted">
                      {checking ? (
                        <Loader2 className="h-4 w-4 animate-spin text-accent" />
                      ) : fileExists ? (
                        <Check className="h-4 w-4 text-accent" />
                      ) : (
                        <FileVideo className="h-4 w-4 text-faint" />
                      )}
                      {checking
                        ? "Проверяю файл…"
                        : fileExists
                          ? "Файл доступен"
                          : "Файл не найден — можно заполнить вручную"}
                    </span>
                  ) : null}
                  {autoFilled ? (
                    <span className="font-mono-tech text-xs text-accent">
                      данные заполнены — проверьте шаги «Видео» и «Аудио»
                    </span>
                  ) : null}
                </div>
              </div>
            </div>
          ) : null}

          {step === 1 ? (
            <TrackEditorSection
              video={video}
              onVideoChange={(patch) => setVideo((current) => ({ ...current, ...patch }))}
              audioRows={audioRows}
              onUpdateAudio={updateAudio}
              onAddAudio={addAudioRow}
              onRemoveAudio={removeAudioRow}
              subtitleRows={subRows}
              onUpdateSubtitle={updateSub}
              onAddSubtitle={addSubRow}
              onRemoveSubtitle={removeSubRow}
              showSectionTitle={false}
              sections={["video"]}
            />
          ) : null}

          {step === 2 ? (
            <TrackEditorSection
              video={video}
              onVideoChange={(patch) => setVideo((current) => ({ ...current, ...patch }))}
              audioRows={audioRows}
              onUpdateAudio={updateAudio}
              onAddAudio={addAudioRow}
              onRemoveAudio={removeAudioRow}
              subtitleRows={subRows}
              onUpdateSubtitle={updateSub}
              onAddSubtitle={addSubRow}
              onRemoveSubtitle={removeSubRow}
              showSectionTitle={false}
              audioGridCols="three"
              sections={["audio"]}
            />
          ) : null}

          {step === 3 ? (
            <TrackEditorSection
              video={video}
              onVideoChange={(patch) => setVideo((current) => ({ ...current, ...patch }))}
              audioRows={audioRows}
              onUpdateAudio={updateAudio}
              onAddAudio={addAudioRow}
              onRemoveAudio={removeAudioRow}
              subtitleRows={subRows}
              onUpdateSubtitle={updateSub}
              onAddSubtitle={addSubRow}
              onRemoveSubtitle={removeSubRow}
              showSectionTitle={false}
              audioGridCols="three"
              emptySubtitleMessage="Субтитров нет"
              sections={["subtitle"]}
            />
          ) : null}
        </motion.div>
      </AnimatePresence>

      {error ? (
        <p className="text-sm text-danger" role="alert">
          {error}
        </p>
      ) : null}

      <div className="flex items-center justify-between gap-3 border-t border-border pt-4">
        <Button
          variant="ghost"
          onClick={() => (canBack ? setStep((s) => s - 1) : onDone?.())}
        >
          <ChevronLeft className="h-4 w-4" />
          {canBack ? "Назад" : "Отмена"}
        </Button>
        {canNext ? (
          <Button variant="secondary" onClick={() => setStep((s) => s + 1)}>
            Далее
            <ChevronRight className="h-4 w-4" />
          </Button>
        ) : (
          <Button variant="primary" loading={loading} onClick={handleSubmit}>
            Добавить в каталог
          </Button>
        )}
      </div>
    </div>
  );
}

function DetailsFields({
  title,
  setTitle,
  year,
  setYear,
  durationSeconds,
  setDurationSeconds,
  releaseType,
  setReleaseType,
  genres,
  setGenres,
  description,
  setDescription,
  setCoverFile,
  setCoverUrl,
}: {
  title: string;
  setTitle: (v: string) => void;
  year: number | null;
  setYear: (v: number | null) => void;
  durationSeconds: number | null;
  setDurationSeconds: (v: number | null) => void;
  releaseType: string;
  setReleaseType: (v: string) => void;
  genres: string[];
  setGenres: (v: string[]) => void;
  description: string;
  setDescription: (v: string) => void;
  setCoverFile: (v: File | null) => void;
  setCoverUrl: (v: string | null) => void;
}) {
  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3">
        <CoverUpload
          onFileChange={setCoverFile}
          onUrlChange={setCoverUrl}
          label="Обложка"
        />
        <div className="min-w-0 flex-1">
          <Field
            label="Название"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            placeholder="Например, Криминальное чтиво"
          />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <YearInput
          value={year}
          onChange={setYear}
          hint="Год выхода фильма, от 1888 до текущего+1. Можно вводить цифрами или шагать кнопками; «Автозаполнить из файла» подставит само."
        />
        <DurationInput
          valueSeconds={durationSeconds}
          onChange={setDurationSeconds}
          hint="Хранится в секундах. Переключайте формат справа: чч:мм:сс, минуты или секунды. «Автозаполнить из файла» подставит само."
        />
      </div>
      <Select
        label="Тип релиза"
        value={releaseType}
        onChange={setReleaseType}
        options={[{ value: "", label: "—" }, ...RELEASE_TYPES]}
        hint="Источник копии: BDRemux, BDRip, WEB-DL, Blu-ray и т.д. Влияет на качество."
      />
      <GenrePicker value={genres} onChange={setGenres} />
      <TextAreaField
        label="Описание"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Краткое описание фильма…"
        hint="Краткое описание сюжета — на твоё усмотрение."
      />
    </div>
  );
}
