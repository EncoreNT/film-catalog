"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, EyeOff, FileVideo, Loader2, Plus, Star, Trash2 } from "lucide-react";
import type { MovieWithTracks } from "@/lib/movie-query";
import { Button } from "./primitives/Button";
import { ConfirmDialog } from "./primitives/ConfirmDialog";
import { Field, TextAreaField } from "./primitives/Field";
import { DatePicker } from "./primitives/DatePicker";
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

interface MovieEditorProps {
  movie: MovieWithTracks;
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

export function MovieEditor({ movie }: MovieEditorProps) {
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

  // --- Video track ---
  const v = movie.videoTrack;
  const [vCodec, setVCodec] = useState(v?.codec ?? "");
  const [vHdr, setVHdr] = useState(v?.hdr ?? "SDR");
  const [vRes, setVRes] = useState(v?.resolutionLabel ?? "");
  const [vWidth, setVWidth] = useState<number | null>(v?.width ?? null);
  const [vHeight, setVHeight] = useState<number | null>(v?.height ?? null);
  const [vFps, setVFps] = useState(v?.fps ?? "");
  const [vBitrate, setVBitrate] = useState<number | null>(v?.bitrate ?? null);

  // --- Audio & subtitle tracks ---
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

  const markDirty = () => setIsDirty(true);

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

  const updateAudio = (i: number, patch: Partial<AudioRow>) => {
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
    markDirty();
  };
  const addAudioTrack = () => {
    setAudioTracks((rows) => [...rows, emptyAudioRow()]);
    markDirty();
  };
  const removeAudioTrack = (i: number) => {
    setAudioTracks((rows) => rows.filter((_, idx) => idx !== i));
    markDirty();
  };
  const setMainTrack = (i: number) => {
    setAudioTracks((rows) =>
      rows.map((row, idx) => ({
        ...row,
        isDefault: idx === i ? !row.isDefault : false,
      })),
    );
    markDirty();
  };

  const updateSubtitle = (i: number, patch: Partial<SubRow>) => {
    setSubtitleTracks((rows) =>
      rows.map((row, idx) => (idx === i ? { ...row, ...patch } : row)),
    );
    markDirty();
  };
  const addSubtitleTrack = () => {
    setSubtitleTracks((rows) => [...rows, emptySubRow()]);
    markDirty();
  };
  const removeSubtitleTrack = (i: number) => {
    setSubtitleTracks((rows) => rows.filter((_, idx) => idx !== i));
    markDirty();
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
          watchedAt: watchedAt ? new Date(watchedAt).toISOString() : null,
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
            profile: t.profile && t.profile !== "None" ? t.profile : null,
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
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Ошибка сохранения");
      }
      setIsDirty(false);
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
            hint="Абсолютный путь к видеофайлу. При сохранении сервер пересчитает чексумму (первые 16 МБ), размер и время изменения. Если файл не существует — вернётся ошибкой."
          >
            <input
              id="путь-к-файлу"
              className="focus-ring min-h-11 w-full rounded-[var(--radius)] border border-border bg-bg-elevated px-3 py-2 text-sm text-text placeholder:text-muted/60"
              value={filePath}
              onChange={(e) => {
                setFilePath(e.target.value);
                markDirty();
              }}
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

        {/* Дорожки */}
        <div className="surface-card space-y-8 p-5">
          <h2 className="font-display text-xl font-semibold">Дорожки</h2>

          <section>
            <h3 className="font-mono-tech mb-4 text-muted">видео</h3>
            <div className="surface-elevated space-y-4 p-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <Select
                  label="Кодек"
                  value={vCodec}
                  onChange={(c) => {
                    setVCodec(c);
                    markDirty();
                  }}
                  options={[{ value: "", label: "—" }, ...VIDEO_CODECS]}
                  hint="Алгоритм сжатия видео: HEVC/H.265, H.264, AV1 и т.д. AV1 и HEVC эффективнее."
                />
                <Field
                  label="FPS"
                  value={vFps}
                  onChange={(e) => {
                    setVFps(e.target.value);
                    markDirty();
                  }}
                  hint="Кадров в секунду. Кино — 23.976, сериалы — 25/30, HFR — 48/60."
                />
              </div>
              <HdrInput
                value={vHdr}
                onChange={(h) => {
                  setVHdr(h);
                  markDirty();
                }}
              />
              <SizeInput
                width={vWidth}
                height={vHeight}
                resolutionLabel={vRes}
                onWidthChange={(w) => {
                  setVWidth(w);
                  markDirty();
                }}
                onHeightChange={(h) => {
                  setVHeight(h);
                  markDirty();
                }}
                onResolutionLabelChange={(r) => {
                  setVRes(r);
                  markDirty();
                }}
              />
              <BitrateInput
                label="Битрейт видео"
                valueKbps={vBitrate}
                onChange={(b) => {
                  setVBitrate(b);
                  markDirty();
                }}
                hint="Скорость видеопотока. Переключается между kbps и Mbps. Больше — выше качество при том же кодеке."
              />
            </div>
          </section>

          <section>
            <h3 className="font-mono-tech mb-4 text-muted">аудиодорожки</h3>
            <div className="space-y-4">
              {audioTracks.map((track, i) => {
                const profileOptions = getAudioProfilesForCodec(track.codec ?? "");
                const profileDisabled =
                  profileOptions.length <= 1 ||
                  (profileOptions.length === 1 &&
                    profileOptions[0].value === "None");
                return (
                  <div key={track.id} className="surface-elevated space-y-3 p-4">
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
                        onChange={(val) => updateAudio(i, { codec: val })}
                        options={[{ value: "", label: "—" }, ...AUDIO_CODECS]}
                        hint="Аудиоформат: TrueHD/E-AC3/AC3/DTS/AAC/FLAC… Определяет доступные профили."
                      />
                      <Select
                        label="Профиль"
                        value={track.profile}
                        onChange={(val) => updateAudio(i, { profile: val })}
                        options={profileOptions}
                        preserveOrder
                        disabled={profileDisabled}
                        hint={
                          profileDisabled
                            ? "У этого кодека нет профилей — поле недоступно."
                            : "Уточнение кодека: Dolby Atmos, DTS-HD MA и т.д. Зависит от выбранного кодека."
                        }
                      />
                      <Select
                        label="Формат"
                        value={track.channelLayout ?? ""}
                        onChange={(val) => updateAudio(i, { channelLayout: val })}
                        options={[{ value: "", label: "—" }, ...CHANNEL_LAYOUTS]}
                        preserveOrder
                        hint="Расположение каналов: 2.0 (стерео), 5.1, 7.1…"
                      />
                      <Select
                        label="Язык"
                        value={track.language ?? ""}
                        onChange={(val) => updateAudio(i, { language: val })}
                        options={[{ value: "", label: "—" }, ...LANGUAGES]}
                        hint="Язык дорожки. Используется для фильтрации каталога."
                      />
                      <Select
                        label="Тип перевода"
                        value={track.translationType}
                        onChange={(val) => updateAudio(i, { translationType: val })}
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
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setMainTrack(i)}
                        className="focus-ring group inline-flex items-center gap-2 rounded-md py-1 text-sm transition-colors"
                        aria-pressed={track.isDefault}
                        aria-label="Основная дорожка"
                      >
                        <Star
                          className={`h-5 w-5 transition-all group-hover:scale-110 ${
                            track.isDefault
                              ? "fill-accent text-accent drop-shadow-[0_0_6px_var(--accent-glow)]"
                              : "fill-transparent text-muted/40"
                          }`}
                          aria-hidden
                        />
                        <span
                          className={`font-mono-tech ${
                            track.isDefault ? "text-accent" : "text-muted"
                          }`}
                        >
                          основная дорожка
                        </span>
                      </button>
                    </div>
                  </div>
                );
              })}
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
                <div key={track.id} className="surface-elevated space-y-3 p-4">
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
                      onChange={(val) => updateSubtitle(i, { codecLabel: val })}
                      options={SUBTITLE_TYPES}
                      hint="Формат субтитров: SRT/ASS (текст), PGS/VobSub (графика) и т.д."
                    />
                    <Select
                      label="Язык"
                      value={track.language ?? ""}
                      onChange={(val) => updateSubtitle(i, { language: val })}
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
                      onChange={(val) => updateSubtitle(i, { forced: val === "yes" })}
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
        </div>
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
