"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, FileVideo, Loader2, Plus, Trash2 } from "lucide-react";
import type { MovieWithTracks } from "@/lib/movie-query";
import { Button } from "./primitives/Button";
import { Field, TextAreaField } from "./primitives/Field";
import { DateField } from "./primitives/DateField";
import { Select } from "./primitives/Select";
import { BitrateInput, SizeInput } from "./primitives/MeasureInput";
import { HdrInput } from "./primitives/HdrInput";
import { StarRating } from "./StarRating";
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
import { MultiSelect } from "./primitives/MultiSelect";
import { DurationInput } from "./primitives/DurationInput";
import { YearInput } from "./primitives/YearInput";
import { CoverUpload } from "./primitives/CoverUpload";

interface MovieFormProps {
  movie: MovieWithTracks;
}

export function MovieForm({ movie }: MovieFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState(movie.title);
  const [year, setYear] = useState<number | null>(movie.year ?? null);
  const [description, setDescription] = useState(movie.description ?? "");
  const [releaseType, setReleaseType] = useState(movie.releaseType ?? "");
  const [filePath, setFilePath] = useState(movie.filePath ?? "");
  const [filePathStatus, setFilePathStatus] = useState<{
    checking: boolean;
    exists: boolean | null;
  }>({ checking: false, exists: null });
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

  const checkFilePath = async (path: string) => {
    if (!path.trim()) {
      setFilePathStatus({ checking: false, exists: null });
      return;
    }
    setFilePathStatus({ checking: true, exists: null });
    try {
      const res = await fetch(
        `/api/movies?path=${encodeURIComponent(path)}`,
        { method: "HEAD" },
      );
      setFilePathStatus({ checking: false, exists: res.ok });
    } catch {
      setFilePathStatus({ checking: false, exists: false });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/movies/${movie.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          year,
          description: description || null,
          releaseType: releaseType || null,
          filePath: filePath.trim() || null,
          genres,
          durationSeconds,
          rating,
          watchedAt: watchedAt
            ? new Date(watchedAt).toISOString()
            : null,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Ошибка сохранения");
      }
      router.refresh();
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

  const handleExclude = async () => {
    if (!confirm("Исключить фильм из каталога?")) return;
    setLoading(true);
    try {
      await fetch(`/api/movies/${movie.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "EXCLUDED" }),
      });
      router.push("/");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex items-start gap-3">
        <CoverUpload
          movieId={movie.id}
          hasCover={!!movie.coverPath}
          onUploaded={() => router.refresh()}
        />
        <div className="min-w-0 flex-1">
          <Field
            label="Название"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </div>
      </div>
      <Field
        label="Путь к файлу"
        placeholder="/Volumes/Seagate/Movies/film.mkv"
        hint="Абсолютный путь к видеофайлу. При сохранении сервер пересчитает чексумму (первые 16 МБ), размер и время изменения. Если файл не существует — вернётся ошибкой."
      >
        <input
          id="путь-к-файлу"
          className="focus-ring min-h-11 w-full rounded-[var(--radius)] border border-border bg-bg-elevated px-3 py-2 text-sm text-text placeholder:text-muted/60"
          value={filePath}
          onChange={(e) => setFilePath(e.target.value)}
          onBlur={(e) => checkFilePath(e.target.value)}
          placeholder="/Volumes/Seagate/Movies/film.mkv"
        />
        {filePath.trim() ? (
          <span className="flex items-center gap-2 text-xs text-muted">
            {filePathStatus.checking ? (
              <Loader2 className="h-4 w-4 animate-spin text-accent" aria-hidden />
            ) : filePathStatus.exists ? (
              <Check className="h-4 w-4 text-accent" aria-hidden />
            ) : (
              <FileVideo className="h-4 w-4 text-faint" aria-hidden />
            )}
            {filePathStatus.checking
              ? "Проверяю файл…"
              : filePathStatus.exists
                ? "Файл доступен"
                : filePathStatus.exists === false
                  ? "Файл не найден — сохранение пути вернётся ошибкой"
                  : "Сохранение пересчитает чексумму"}
          </span>
        ) : (
          <span className="text-xs text-faint">
            не указан — будет сброшен при сохранении
          </span>
        )}
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <YearInput
          value={year}
          onChange={setYear}
          hint={`Год выхода фильма, от 1888 до текущего+1. Можно вводить цифрами или шагать кнопками.`}
        />
        <DurationInput
          valueSeconds={durationSeconds}
          onChange={setDurationSeconds}
          hint="Хранится в секундах. Переключайте формат справа: чч:мм:сс, минуты или секунды. При сканировании заполняется из ffprobe."
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
        hint="Краткое описание сюжета — на твоё усмотрение."
      />

      <div className="space-y-2">
        <p className="text-sm text-muted">Оценка</p>
        <StarRating value={rating} onChange={setRating} />
      </div>

      <DateField
        label="Дата просмотра"
        value={watchedAt}
        onChange={(e) => setWatchedAt(e.target.value)}
      />

      {error ? (
        <p className="text-sm text-danger" role="alert">
          {error}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <Button type="submit" variant="primary" loading={loading}>
          Сохранить
        </Button>
        {movie.status === "DRAFT" ? (
          <Button type="button" variant="secondary" loading={loading} onClick={handleApprove}>
            В каталог
          </Button>
        ) : null}
        <Button type="button" variant="danger" loading={loading} onClick={handleExclude}>
          Исключить
        </Button>
      </div>
    </form>
  );
}

interface AudioRow {
  id: string;
  codec: string | null;
  profile: string;
  channels: number | null;
  channelLayout: string | null;
  bitrate: number | null;
  language: string | null;
  translationType: string;
  title: string | null;
  isDefault: boolean;
}

interface SubRow {
  id: string;
  codec: string | null;
  codecLabel: string | null;
  language: string | null;
  title: string | null;
  isDefault: boolean;
  forced: boolean;
}

const newAudioId = () => `audio-${crypto.randomUUID()}`;
const newSubId = () => `sub-${crypto.randomUUID()}`;

const emptyAudioRow = (): AudioRow => ({
  id: newAudioId(),
  codec: null,
  profile: "None",
  channels: null,
  channelLayout: null,
  bitrate: null,
  language: null,
  translationType: "",
  title: null,
  isDefault: false,
});

const emptySubRow = (): SubRow => ({
  id: newSubId(),
  codec: null,
  codecLabel: "SRT",
  language: null,
  title: null,
  isDefault: false,
  forced: false,
});

interface TrackEditorProps {
  movie: MovieWithTracks;
}

export function TrackEditor({ movie }: TrackEditorProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const v = movie.videoTrack;

  const [vCodec, setVCodec] = useState(v?.codec ?? "");
  const [vHdr, setVHdr] = useState(v?.hdr ?? "SDR");
  const [vRes, setVRes] = useState(v?.resolutionLabel ?? "");
  const [vWidth, setVWidth] = useState<number | null>(v?.width ?? null);
  const [vHeight, setVHeight] = useState<number | null>(v?.height ?? null);
  const [vFps, setVFps] = useState(v?.fps ?? "");
  const [vBitrate, setVBitrate] = useState<number | null>(v?.bitrate ?? null);

  const [audioTracks, setAudioTracks] = useState<AudioRow[]>(
    movie.audioTracks.map((t) => ({
      id: `audio-${t.id}`,
      codec: t.codec,
      profile: normalizeAudioProfile(t.codec ?? "", t.profile ?? "None"),
      channels: t.channels,
      channelLayout: t.channelLayout,
      bitrate: t.bitrate,
      language: t.language,
      translationType: t.translationType ?? "",
      title: t.title,
      isDefault: t.isDefault,
    })),
  );
  const [subtitleTracks, setSubtitleTracks] = useState<SubRow[]>(
    movie.subtitleTracks.map((t) => ({
      id: `sub-${t.id}`,
      codec: t.codec,
      codecLabel: t.codecLabel,
      language: t.language,
      title: t.title,
      isDefault: t.isDefault,
      forced: t.forced,
    })),
  );

  const updateAudio = (i: number, patch: Partial<AudioRow>) =>
    setAudioTracks((rows) =>
      rows.map((row, idx) => {
        if (idx !== i) return row;
        const next = { ...row, ...patch };
        if (patch.codec !== undefined) {
          next.profile = normalizeAudioProfile(patch.codec ?? "", row.profile);
        }
        return next;
      }),
    );
  const addAudioTrack = () =>
    setAudioTracks((rows) => [...rows, emptyAudioRow()]);
  const removeAudioTrack = (i: number) =>
    setAudioTracks((rows) => rows.filter((_, idx) => idx !== i));

  const updateSubtitle = (i: number, patch: Partial<SubRow>) =>
    setSubtitleTracks((rows) =>
      rows.map((row, idx) => (idx === i ? { ...row, ...patch } : row)),
    );
  const addSubtitleTrack = () =>
    setSubtitleTracks((rows) => [...rows, emptySubRow()]);
  const removeSubtitleTrack = (i: number) =>
    setSubtitleTracks((rows) => rows.filter((_, idx) => idx !== i));

  const saveTracks = async () => {
    setLoading(true);
    try {
      await fetch(`/api/movies/${movie.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          videoTrack: {
            width: vWidth,
            height: vHeight,
            resolutionLabel: vRes || null,
            codec: vCodec || null,
            hdr: vHdr || null,
            fps: vFps || null,
            bitrate: vBitrate,
          },
          audioTracks: audioTracks.map((t, i) => ({
            streamIndex: i,
            codec: t.codec,
            profile:
              t.profile && t.profile !== "None" ? t.profile : null,
            channels: t.channels,
            channelLayout: t.channelLayout,
            bitrate: t.bitrate,
            language: t.language,
            translationType: t.translationType || null,
            title: t.title,
            isDefault: t.isDefault,
          })),
          subtitleTracks: subtitleTracks.map((t, i) => ({
            streamIndex: i,
            codec: t.codec,
            codecLabel: t.codecLabel,
            language: t.language,
            title: t.title,
            isDefault: t.isDefault,
            forced: t.forced,
          })),
        }),
      });
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <section>
        <h3 className="font-mono-tech mb-4 text-muted">видео</h3>
        <div className="surface-card space-y-4 p-4">
          <div className="grid gap-3 sm:grid-cols-2">
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
            hint="Скорость видеопотока. Переключается между kbps и Mbps. Больше — выше качество при том же кодеке."
          />
        </div>
      </section>

      <section>
        <h3 className="font-mono-tech mb-4 text-muted">аудиодорожки</h3>
        <div className="space-y-4">
          {audioTracks.map((track, i) => (
            <div key={track.id} className="surface-card space-y-3 p-4">
              <div className="flex items-center justify-between">
                <span className="font-mono-tech text-faint">
                  дорожка {i + 1}
                </span>
                <button
                  type="button"
                  onClick={() => removeAudioTrack(i)}
                  aria-label="Удалить дорожку"
                  className="focus-ring rounded-md p-1.5 text-muted transition-colors hover:text-danger"
                >
                  <Trash2 className="h-4 w-4" aria-hidden />
                </button>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Select
                  label="Кодек"
                  value={track.codec ?? ""}
                  onChange={(v) => updateAudio(i, { codec: v })}
                  options={[{ value: "", label: "—" }, ...AUDIO_CODECS]}
                  hint="Аудиоформат: TrueHD/E-AC3/AC3/DTS/AAC/FLAC… Определяет доступные профили."
                />
                <Select
                  label="Профиль"
                  value={track.profile}
                  onChange={(v) => updateAudio(i, { profile: v })}
                  options={getAudioProfilesForCodec(track.codec ?? "")}
                  preserveOrder
                  hint="Уточнение кодека: Dolby Atmos, DTS-HD MA и т.д. Зависит от выбранного кодека."
                />
                <Select
                  label="Формат"
                  value={track.channelLayout ?? ""}
                  onChange={(v) => updateAudio(i, { channelLayout: v })}
                  options={[{ value: "", label: "—" }, ...CHANNEL_LAYOUTS]}
                  preserveOrder
                  hint="Расположение каналов: 2.0 (стерео), 5.1, 7.1…"
                />
                <Select
                  label="Язык"
                  value={track.language ?? ""}
                  onChange={(v) => updateAudio(i, { language: v })}
                  options={[{ value: "", label: "—" }, ...LANGUAGES]}
                  hint="Язык дорожки. Используется для фильтрации каталога."
                />
                <Select
                  label="Тип перевода"
                  value={track.translationType}
                  onChange={(v) => updateAudio(i, { translationType: v })}
                  options={[
                    { value: "", label: "—" },
                    ...AUDIO_TRANSLATION_TYPES,
                  ]}
                  hint="Дубляж, многоголосый, авторский, оригинал и т.д."
                />
                <BitrateInput
                  label="Битрейт"
                  valueKbps={track.bitrate}
                  onChange={(kbps) => updateAudio(i, { bitrate: kbps })}
                  hint="Скорость аудиопотока. Переключается kbps/Mbps."
                />
                <Field
                  label="Название дорожки"
                  value={track.title ?? ""}
                  onChange={(e) => updateAudio(i, { title: e.target.value })}
                />
              </div>
              <label className="flex cursor-pointer items-center gap-2 text-sm text-muted">
                <input
                  type="checkbox"
                  checked={track.isDefault}
                  onChange={(e) => updateAudio(i, { isDefault: e.target.checked })}
                  className="h-4 w-4 accent-accent"
                />
                основная дорожка
              </label>
            </div>
          ))}
          <Button variant="secondary" type="button" onClick={addAudioTrack}>
            <Plus className="h-4 w-4" aria-hidden />
            Добавить дорожку
          </Button>
        </div>
      </section>

      <section>
        <h3 className="font-mono-tech mb-4 text-muted">субтитры</h3>
        <div className="space-y-4">
          {subtitleTracks.length === 0 ? (
            <p className="font-mono-tech text-sm text-faint">
              нет субтитров
            </p>
          ) : null}
          {subtitleTracks.map((track, i) => (
            <div key={track.id} className="surface-card space-y-3 p-4">
              <div className="flex items-center justify-between">
                <span className="font-mono-tech text-faint">
                  субтитры {i + 1}
                </span>
                <button
                  type="button"
                  onClick={() => removeSubtitleTrack(i)}
                  aria-label="Удалить субтитры"
                  className="focus-ring rounded-md p-1.5 text-muted transition-colors hover:text-danger"
                >
                  <Trash2 className="h-4 w-4" aria-hidden />
                </button>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Select
                  label="Тип"
                  value={track.codecLabel ?? ""}
                  onChange={(v) => updateSubtitle(i, { codecLabel: v })}
                  options={SUBTITLE_TYPES}
                  hint="Формат субтитров: SRT/ASS (текст), PGS/VobSub (графика) и т.д."
                />
                <Select
                  label="Язык"
                  value={track.language ?? ""}
                  onChange={(v) => updateSubtitle(i, { language: v })}
                  options={[{ value: "", label: "—" }, ...LANGUAGES]}
                  hint="Язык субтитров. Используется для фильтрации каталога."
                />
                <Field
                  label="Название"
                  value={track.title ?? ""}
                  onChange={(e) => updateSubtitle(i, { title: e.target.value })}
                />
                <Select
                  label="Forced"
                  value={track.forced ? "yes" : "no"}
                  onChange={(v) => updateSubtitle(i, { forced: v === "yes" })}
                  preserveOrder
                  options={[
                    { value: "no", label: "Нет" },
                    { value: "yes", label: "Да" },
                  ]}
                  hint="Forced-субтитры показываются принудительно (например, перевод надписей в кадре)."
                />
              </div>
              <label className="flex cursor-pointer items-center gap-2 text-sm text-muted">
                <input
                  type="checkbox"
                  checked={track.isDefault}
                  onChange={(e) => updateSubtitle(i, { isDefault: e.target.checked })}
                  className="h-4 w-4 accent-accent"
                />
                основные
              </label>
            </div>
          ))}
          <Button variant="secondary" type="button" onClick={addSubtitleTrack}>
            <Plus className="h-4 w-4" aria-hidden />
            Добавить субтитры
          </Button>
        </div>
      </section>

      <Button variant="secondary" loading={loading} onClick={saveTracks}>
        Сохранить дорожки
      </Button>
    </div>
  );
}
