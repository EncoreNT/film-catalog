"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import {
  Sparkles,
  HardDrive,
  Plug,
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
import { Button } from "./primitives/Button";
import { Field, TextAreaField } from "./primitives/Field";
import { Select } from "./primitives/Select";
import { SegmentedControl } from "./primitives/SegmentedControl";
import {
  RELEASE_TYPES,
  GENRES,
} from "@/lib/dictionaries";
import { parseMoviePath } from "@/lib/name-parser";
import type { ProbeResult } from "@/lib/ffprobe";
import { MultiSelect } from "./primitives/MultiSelect";
import { DurationInput } from "./primitives/DurationInput";
import { YearInput } from "./primitives/YearInput";
import { CoverUpload } from "./primitives/CoverUpload";
import { TrackEditorSection } from "./TrackEditorSection";
import { useFilePathCheck } from "@/hooks/useFilePathCheck";
import { useTrackEditor } from "@/hooks/useTrackEditor";
import type { VideoFieldState } from "@/lib/movie-form-types";
import { emptyAudioFormRow } from "@/lib/movie-form-types";
import {
  probeToAudioRows,
  probeToSubtitleRows,
  probeToVideoFields,
} from "@/lib/apply-probe";
import { buildMovieCreatePayload } from "@/lib/build-movie-payload";

interface AddMovieFormProps {
  onDone?: () => void;
}

type StorageKind = "local" | "external";

interface Storage {
  id: number;
  name: string;
  type: "LOCAL" | "EXTERNAL";
  path?: string | null;
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

  const [storageKind, setStorageKind] = useState<StorageKind>("local");
  const [storages, setStorages] = useState<Storage[]>([]);
  const [selectedStorageId, setSelectedStorageId] = useState<string>("");
  const [newStorageName, setNewStorageName] = useState("");

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

  const externalStorages = storages.filter((s) => s.type === "EXTERNAL");

  useEffect(() => {
    fetch("/api/storages")
      .then((r) => r.json())
      .then((d) => setStorages(d.storages ?? []));
  }, []);

  const handleFilePathBlur = () => {
    const trimmed = filePath.trim();
    if (!trimmed) return;
    const parsed = parseMoviePath(trimmed);
    if (!title) setTitle(parsed.title);
    if (year == null && parsed.year) setYear(parsed.year);
    if (!releaseType && parsed.releaseType) setReleaseType(parsed.releaseType);
    void checkFilePath(trimmed);
  };

  const applyProbeResult = (data: ProbeResult) => {
    if (data.durationSeconds) {
      setDurationSeconds(data.durationSeconds);
    }
    setVideo((current) => ({ ...current, ...probeToVideoFields(data.video) }));
    if (data.audio.length) {
      setAudioRowsFromProbe(probeToAudioRows(data.audio));
    }
    if (data.subtitles.length) {
      setSubtitleRowsFromProbe(probeToSubtitleRows(data.subtitles));
    }
    setAutoFilled(true);
    setTimeout(() => setAutoFilled(false), 3000);
  };

  const handleAutoFill = async () => {
    if (!filePath.trim()) {
      setError("Укажите путь к файлу для автозаполнения");
      return;
    }
    setError(null);
    setAutoFilling(true);
    try {
      const res = await fetch("/api/movies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title || "probe", probeOnly: true, filePath: filePath.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Не удалось прочитать файл");
      applyProbeResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка автозаполнения");
    } finally {
      setAutoFilling(false);
    }
  };

  const createStorageIfNeeded = async (): Promise<number | null> => {
    if (storageKind === "local") {
      const local = storages.find((s) => s.type === "LOCAL");
      if (local) return local.id;
      const res = await fetch("/api/storages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Локальный диск", type: "LOCAL" }),
      });
      const created = await res.json();
      return created.id;
    }
    if (selectedStorageId) return parseInt(selectedStorageId, 10);
    if (newStorageName.trim()) {
      const res = await fetch("/api/storages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newStorageName.trim(), type: "EXTERNAL" }),
      });
      const created = await res.json();
      return created.id;
    }
    return null;
  };

  const handleSubmit = async () => {
    setError(null);
    if (!title.trim()) {
      setError("Укажите название");
      setStep(0);
      return;
    }
    if (storageKind === "external" && !selectedStorageId && !newStorageName.trim()) {
      setError("Укажите название внешнего диска");
      setStep(0);
      return;
    }

    setLoading(true);
    try {
      const storageId = await createStorageIfNeeded();

      const payload = buildMovieCreatePayload({
        title,
        year,
        description: description.trim() || null,
        storageId,
        releaseType: releaseType || null,
        genres,
        durationSeconds,
        filePath: filePath.trim() || null,
        video,
        audioRows,
        subtitleRows: subRows,
      });

      const res = await fetch("/api/movies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error ?? "Ошибка добавления");
      }
      const movie = await res.json();
      if (coverFile) {
        try {
          const coverForm = new FormData();
          coverForm.append("cover", coverFile);
          await fetch(`/api/movies/${movie.id}/cover`, {
            method: "POST",
            body: coverForm,
          });
        } catch {
          // Cover upload is non-fatal; the movie is already created.
        }
      } else if (coverUrl) {
        try {
          await fetch(`/api/movies/${movie.id}/cover`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url: coverUrl }),
          });
        } catch {
          // Cover upload is non-fatal; the movie is already created.
        }
      }
      onDone?.();
      router.push(`/movies/${movie.id}`);
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
                setStorageKind={setStorageKind}
                externalStorages={externalStorages}
                selectedStorageId={selectedStorageId}
                setSelectedStorageId={setSelectedStorageId}
                newStorageName={newStorageName}
                setNewStorageName={setNewStorageName}
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
      <MultiSelect
        label="Жанры"
        value={genres}
        onChange={setGenres}
        options={GENRES}
        searchable
        hint="Можно выбрать несколько жанров. Используются для фильтрации в каталоге."
      />
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

function StoragePicker({
  storageKind,
  setStorageKind,
  externalStorages,
  selectedStorageId,
  setSelectedStorageId,
  newStorageName,
  setNewStorageName,
}: {
  storageKind: StorageKind;
  setStorageKind: (v: StorageKind) => void;
  externalStorages: Storage[];
  selectedStorageId: string;
  setSelectedStorageId: (v: string) => void;
  newStorageName: string;
  setNewStorageName: (v: string) => void;
}) {
  return (
    <div className="space-y-3">
      <p className="font-mono-tech text-muted">хранилище</p>
      <SegmentedControl
        ariaLabel="Хранилище"
        value={storageKind}
        onChange={(v) => setStorageKind(v as StorageKind)}
        options={[
          { value: "local", label: "Локальный диск", icon: <HardDrive className="h-4 w-4" /> },
          { value: "external", label: "Внешний диск", icon: <Plug className="h-4 w-4" /> },
        ]}
      />
      {storageKind === "external" ? (
        externalStorages.length > 0 ? (
          <Select
            label="Выберите диск"
            value={selectedStorageId}
            onChange={setSelectedStorageId}
            options={[
              { value: "", label: "— новый диск —" },
              ...externalStorages.map((s) => ({
                value: String(s.id),
                label: s.name,
              })),
            ]}
          />
        ) : null
      ) : null}
      {storageKind === "external" && !selectedStorageId ? (
        <Field
          label="Название нового диска"
          value={newStorageName}
          onChange={(e) => setNewStorageName(e.target.value)}
          placeholder="Например, Seagate 4TB"
        />
      ) : null}
    </div>
  );
}
