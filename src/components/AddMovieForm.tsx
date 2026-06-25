"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import {
  Sparkles,
  HardDrive,
  Plug,
  Plus,
  Trash2,
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
import { BitrateInput, SizeInput } from "./primitives/MeasureInput";
import { HdrInput } from "./primitives/HdrInput";
import {
  VIDEO_CODECS,
  AUDIO_CODECS,
  CHANNEL_LAYOUTS,
  SUBTITLE_TYPES,
  LANGUAGES,
  RELEASE_TYPES,
  AUDIO_TRANSLATION_TYPES,
  GENRES,
  getAudioProfilesForCodec,
  normalizeAudioProfile,
} from "@/lib/dictionaries";
import { parseReleaseType } from "@/lib/name-parser";
import { MultiSelect } from "./primitives/MultiSelect";
import { DurationInput } from "./primitives/DurationInput";
import { YearInput } from "./primitives/YearInput";
import { CoverUpload } from "./primitives/CoverUpload";

interface AddMovieFormProps {
  onDone?: () => void;
}

const QUALITY_TAGS =
  /\b(2160p|1080p|720p|480p|4k|uhd|hd|sd|x264|x265|h\.?264|h\.?265|hevc|avc|xvid|divx|web-?dl|webrip|bluray|blu-?ray|bdrip|brrip|remux|repack|proper|extended|unrated|directors?.cut|imax|10bit|8bit|hdr10\+?|dolby.?vision|dv|hlg|sdr|aac|ac3|eac3|dts|truehd|atmos|multi|dual|rus|eng|sub|dub|rip|cam|ts|tc|scr|r5|dvdrip|hdtv|amzn|nf|dsnp|hmax|atvp|repack2|internal|limited|fs|ws)\b/gi;
const YEAR_PATTERN = /(?:\(|\[|\s|^)(19\d{2}|20\d{2})(?:\)|\]|\s|$)/;

function cleanName(raw: string): string {
  let name = raw.replace(/[._]/g, " ").replace(/\s+/g, " ").trim();
  name = name.replace(QUALITY_TAGS, " ");
  name = name.replace(YEAR_PATTERN, " ");
  name = name.replace(/[[\](){}]/g, " ");
  name = name.replace(/\s+/g, " ").trim();
  return name || raw.trim();
}
function extractYear(raw: string): number | null {
  const m = raw.match(YEAR_PATTERN);
  if (!m) return null;
  const y = parseInt(m[1], 10);
  return y >= 1900 && y <= 2100 ? y : null;
}
function parseFromPath(p: string): {
  title: string;
  year: number | null;
  releaseType: string | null;
} {
  const segs = p.replace(/\\/g, "/").split("/").filter(Boolean);
  const fileName = segs[segs.length - 1] ?? p;
  const base = fileName.replace(/\.[^.]+$/, "");
  const parent = segs.length > 1 ? segs[segs.length - 2] : "";
  const fileClean = cleanName(base);
  const parentClean = parent ? cleanName(parent) : "";
  const useParent =
    parentClean &&
    parentClean.length >= 2 &&
    (fileClean.length <= 2 ||
      (QUALITY_TAGS.test(base) && !QUALITY_TAGS.test(parent)));
  return {
    title: useParent ? parentClean : fileClean || base,
    year: extractYear(base) ?? extractYear(parent),
    releaseType: parseReleaseType(`${base} ${parent}`),
  };
}

type StorageKind = "local" | "external";

interface Storage {
  id: number;
  name: string;
  type: "LOCAL" | "EXTERNAL";
  path?: string | null;
}

interface AudioRow {
  codec: string;
  profile: string;
  channelLayout: string;
  language: string;
  translationType: string;
  bitrate: number | null;
  title: string;
  isDefault: boolean;
}
interface SubRow {
  codecLabel: string;
  language: string;
  forced: boolean;
  isDefault: boolean;
  title: string;
}

interface ProbeVideo {
  width: number | null;
  height: number | null;
  resolutionLabel: string | null;
  codec: string | null;
  hdr: string | null;
  fps: string | null;
  bitrate: number | null;
}

interface ProbeAudio {
  streamIndex: number;
  codec: string | null;
  profile: string | null;
  channelLayout: string | null;
  bitrate: number | null;
  language: string | null;
  title: string | null;
  isDefault: boolean;
}

interface ProbeSubtitle {
  streamIndex: number;
  codecLabel: string | null;
  language: string | null;
  title: string | null;
  isDefault: boolean;
  forced: boolean;
}

const STEPS: { key: string; label: string; icon: React.ReactNode }[] = [
  { key: "details", label: "Детали", icon: <Sparkles className="h-4 w-4" /> },
  { key: "video", label: "Видео", icon: <Clapperboard className="h-4 w-4" /> },
  { key: "audio", label: "Аудио", icon: <Music className="h-4 w-4" /> },
  { key: "subs", label: "Субтитры", icon: <Subtitles className="h-4 w-4" /> },
];

const emptyAudioRow = (): AudioRow => ({
  codec: "",
  profile: "None",
  channelLayout: "",
  language: "",
  translationType: "",
  bitrate: null,
  title: "",
  isDefault: true,
});

export function AddMovieForm({ onDone }: AddMovieFormProps) {
  const router = useRouter();
  const [step, setStep] = useState(0);

  const [title, setTitle] = useState("");
  const [year, setYear] = useState<number | null>(null);
  const [description, setDescription] = useState("");
  const [filePath, setFilePath] = useState("");
  const [fileExists, setFileExists] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(false);
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
  const [vCodec, setVCodec] = useState("");
  const [vHdr, setVHdr] = useState("SDR");
  const [vRes, setVRes] = useState("");
  const [vWidth, setVWidth] = useState<number | null>(null);
  const [vHeight, setVHeight] = useState<number | null>(null);
  const [vFps, setVFps] = useState("");
  const [vBitrate, setVBitrate] = useState<number | null>(null);

  const [audioRows, setAudioRows] = useState<AudioRow[]>([emptyAudioRow()]);
  const [subRows, setSubRows] = useState<SubRow[]>([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const externalStorages = storages.filter((s) => s.type === "EXTERNAL");

  useEffect(() => {
    fetch("/api/storages")
      .then((r) => r.json())
      .then((d) => setStorages(d.storages ?? []));
  }, []);

  const checkFilePath = async (path: string) => {
    if (!path.trim()) {
      setFileExists(null);
      return;
    }
    setChecking(true);
    try {
      const res = await fetch(
        `/api/movies?path=${encodeURIComponent(path)}`,
        { method: "HEAD" },
      );
      setFileExists(res.ok);
    } catch {
      setFileExists(false);
    } finally {
      setChecking(false);
    }
  };

  const handleFilePathBlur = () => {
    const trimmed = filePath.trim();
    if (!trimmed) {
      setFileExists(null);
      return;
    }
    const parsed = parseFromPath(trimmed);
    if (!title) setTitle(parsed.title);
    if (year == null && parsed.year) setYear(parsed.year);
    if (!releaseType && parsed.releaseType) setReleaseType(parsed.releaseType);
    void checkFilePath(trimmed);
  };

  const applyProbeResult = (data: {
    durationSeconds: number | null;
    video: ProbeVideo | null;
    audio: ProbeAudio[];
    subtitles: ProbeSubtitle[];
  }) => {
    if (data.durationSeconds) {
      setDurationSeconds(data.durationSeconds);
    }
    if (data.video) {
      const v = data.video;
      setVCodec(v.codec ?? "");
      setVHdr(v.hdr ?? "SDR");
      setVRes(v.resolutionLabel ?? "");
      setVWidth(v.width);
      setVHeight(v.height);
      setVFps(v.fps ?? "");
      setVBitrate(v.bitrate);
    }
    if (data.audio.length) {
      setAudioRows(
        data.audio.map((a) => ({
          codec: a.codec ?? "",
          profile: normalizeAudioProfile(
            a.codec ?? "",
            a.profile ?? "None",
          ),
          channelLayout: a.channelLayout ?? "",
          language: a.language ?? "",
          translationType: "",
          bitrate: a.bitrate,
          title: a.title ?? "",
          isDefault: a.isDefault,
        })),
      );
    }
    if (data.subtitles.length) {
      setSubRows(
        data.subtitles.map((s) => ({
          codecLabel: s.codecLabel ?? "SRT",
          language: s.language ?? "",
          forced: s.forced,
          isDefault: s.isDefault,
          title: s.title ?? "",
        })),
      );
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

  const addAudioRow = () =>
    setAudioRows((r) => [...r, { ...emptyAudioRow(), isDefault: false }]);
  const removeAudioRow = (i: number) =>
    setAudioRows((r) => r.filter((_, idx) => idx !== i));
  const updateAudio = (i: number, patch: Partial<AudioRow>) =>
    setAudioRows((r) =>
      r.map((row, idx) => {
        if (idx !== i) return row;
        const next = { ...row, ...patch };
        if (patch.codec !== undefined) {
          next.profile = normalizeAudioProfile(patch.codec, row.profile);
        }
        return next;
      }),
    );

  const addSubRow = () =>
    setSubRows((r) => [
      ...r,
      { codecLabel: "SRT", language: "", forced: false, isDefault: false, title: "" },
    ]);
  const removeSubRow = (i: number) =>
    setSubRows((r) => r.filter((_, idx) => idx !== i));
  const updateSub = (i: number, patch: Partial<SubRow>) =>
    setSubRows((r) => r.map((row, idx) => (idx === i ? { ...row, ...patch } : row)));

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

      const payload: Record<string, unknown> = {
        title: title.trim(),
        year,
        description: description.trim() || null,
        storageId,
        releaseType: releaseType || null,
        genres,
        durationSeconds,
        filePath: filePath.trim() || null,
        status: "CATALOG",
        skipProbe: true,
        videoTrack: {
          width: vWidth,
          height: vHeight,
          resolutionLabel: vRes || null,
          codec: vCodec || null,
          hdr: vHdr || null,
          fps: vFps || null,
          bitrate: vBitrate,
        },
        audioTracks: audioRows
          .filter((r) => r.codec || r.channelLayout || r.language)
          .map((r, i) => ({
            streamIndex: i,
            codec: r.codec || null,
            profile: r.profile && r.profile !== "None" ? r.profile : null,
            channelLayout: r.channelLayout || null,
            language: r.language || null,
            translationType: r.translationType || null,
            bitrate: r.bitrate,
            title: r.title || null,
            isDefault: r.isDefault,
          })),
        subtitleTracks: subRows
          .filter((r) => r.codecLabel || r.language)
          .map((r, i) => ({
            streamIndex: i,
            codecLabel: r.codecLabel || null,
            language: r.language || null,
            forced: r.forced,
            isDefault: r.isDefault,
            title: r.title || null,
          })),
      };

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
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Select
                  label="Кодек"
                  value={vCodec}
                  onChange={setVCodec}
                  options={[{ value: "", label: "—" }, ...VIDEO_CODECS]}
                  hint="Алгоритм сжатия видео: HEVC/H.265, H.264, AV1 и т.д. AV1 и HEVC эффективнее."
                />
                <Field
                  label="FPS"
                  value={vFps}
                  onChange={(e) => setVFps(e.target.value)}
                  placeholder="23.976"
                  hint="Кадров в секунду. Кино — 23.976, сериалы — 25/30, HFR — 48/60."
                />
              </div>
              <HdrInput value={vHdr} onChange={setVHdr} />
              <SizeInput
                width={vWidth}
                height={vHeight}
                resolutionLabel={vRes}
                onWidthChange={setVWidth}
                onHeightChange={setVHeight}
                onResolutionLabelChange={setVRes}
              />
              <BitrateInput
                label="Битрейт видео"
                valueKbps={vBitrate}
                onChange={setVBitrate}
                hint="Скорость видеопотока. Переключается kbps/Mbps. Больше — выше качество при том же кодеке."
              />
            </div>
          ) : null}

          {step === 2 ? (
            <div className="space-y-4">
              {audioRows.map((row, i) => (
                <div key={i} className="surface-elevated space-y-3 p-4">
                  <div className="flex items-center justify-between">
                    <span className="font-mono-tech text-faint">дорожка {i + 1}</span>
                    {audioRows.length > 1 ? (
                      <button
                        type="button"
                        onClick={() => removeAudioRow(i)}
                        aria-label="Удалить дорожку"
                        className="focus-ring rounded-md p-1.5 text-muted hover:text-danger"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    ) : null}
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    <Select
                      label="Кодек"
                      value={row.codec}
                      onChange={(v) => updateAudio(i, { codec: v })}
                      options={[{ value: "", label: "—" }, ...AUDIO_CODECS]}
                      hint="Аудиоформат: TrueHD/E-AC3/AC3/DTS/AAC/FLAC… Определяет доступные профили."
                    />
                    <Select
                      label="Профиль"
                      value={row.profile}
                      onChange={(v) => updateAudio(i, { profile: v })}
                      options={getAudioProfilesForCodec(row.codec)}
                      preserveOrder
                      hint="Уточнение кодека: Dolby Atmos, DTS-HD MA и т.д. Зависит от выбранного кодека."
                    />
                    <Select
                      label="Формат"
                      value={row.channelLayout}
                      onChange={(v) => updateAudio(i, { channelLayout: v })}
                      options={[{ value: "", label: "—" }, ...CHANNEL_LAYOUTS]}
                      preserveOrder
                      hint="Расположение каналов: 2.0 (стерео), 5.1, 7.1…"
                    />
                    <Select
                      label="Язык"
                      value={row.language}
                      onChange={(v) => updateAudio(i, { language: v })}
                      options={[{ value: "", label: "—" }, ...LANGUAGES]}
                      hint="Язык дорожки. Используется для фильтрации каталога."
                    />
                    <Select
                      label="Тип перевода"
                      value={row.translationType}
                      onChange={(v) => updateAudio(i, { translationType: v })}
                      options={[
                        { value: "", label: "—" },
                        ...AUDIO_TRANSLATION_TYPES,
                      ]}
                      hint="Дубляж, многоголосый, авторский, оригинал и т.д."
                    />
                    <BitrateInput
                      label="Битрейт"
                      valueKbps={row.bitrate}
                      onChange={(kbps) => updateAudio(i, { bitrate: kbps })}
                      hint="Скорость аудиопотока. Переключается kbps/Mbps."
                    />
                    <Field
                      label="Название"
                      value={row.title}
                      onChange={(e) => updateAudio(i, { title: e.target.value })}
                      placeholder="Surround 7.1"
                    />
                  </div>
                  <label className="flex cursor-pointer items-center gap-2 text-sm text-muted">
                    <input
                      type="checkbox"
                      checked={row.isDefault}
                      onChange={(e) =>
                        updateAudio(i, { isDefault: e.target.checked })
                      }
                      className="h-4 w-4 accent-accent"
                    />
                    основная дорожка
                  </label>
                </div>
              ))}
              <Button variant="secondary" onClick={addAudioRow}>
                <Plus className="h-4 w-4" />
                Добавить дорожку
              </Button>
            </div>
          ) : null}

          {step === 3 ? (
            <div className="space-y-4">
              {subRows.length === 0 ? (
                <div className="surface-elevated flex flex-col items-center gap-3 p-8 text-center">
                  <Subtitles className="h-8 w-8 text-faint" />
                  <p className="text-sm text-muted">Субтитров нет</p>
                </div>
              ) : null}
              {subRows.map((row, i) => (
                <div key={i} className="surface-elevated space-y-3 p-4">
                  <div className="flex items-center justify-between">
                    <span className="font-mono-tech text-faint">субтитры {i + 1}</span>
                    <button
                      type="button"
                      onClick={() => removeSubRow(i)}
                      aria-label="Удалить"
                      className="focus-ring rounded-md p-1.5 text-muted hover:text-danger"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    <Select
                      label="Тип"
                      value={row.codecLabel}
                      onChange={(v) => updateSub(i, { codecLabel: v })}
                      options={SUBTITLE_TYPES}
                      hint="Формат субтитров: SRT/ASS (текст), PGS/VobSub (графика) и т.д."
                    />
                    <Select
                      label="Язык"
                      value={row.language}
                      onChange={(v) => updateSub(i, { language: v })}
                      options={[{ value: "", label: "—" }, ...LANGUAGES]}
                      hint="Язык субтитров. Используется для фильтрации каталога."
                    />
                    <Field
                      label="Название"
                      value={row.title}
                      onChange={(e) => updateSub(i, { title: e.target.value })}
                      placeholder="Full"
                    />
                  </div>
                  <div className="flex gap-5">
                    <label className="flex cursor-pointer items-center gap-2 text-sm text-muted">
                      <input
                        type="checkbox"
                        checked={row.isDefault}
                        onChange={(e) =>
                          updateSub(i, { isDefault: e.target.checked })
                        }
                        className="h-4 w-4 accent-accent"
                      />
                      основные
                    </label>
                    <label className="flex cursor-pointer items-center gap-2 text-sm text-muted">
                      <input
                        type="checkbox"
                        checked={row.forced}
                        onChange={(e) => updateSub(i, { forced: e.target.checked })}
                        className="h-4 w-4 accent-accent"
                      />
                      forced
                    </label>
                  </div>
                </div>
              ))}
              <Button variant="secondary" onClick={addSubRow}>
                <Plus className="h-4 w-4" />
                Добавить субтитры
              </Button>
            </div>
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
