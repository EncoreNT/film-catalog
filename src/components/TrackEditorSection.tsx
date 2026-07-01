"use client";

import { Plus, Star, Trash2 } from "lucide-react";
import { Button } from "./primitives/Button";
import { Field } from "./primitives/Field";
import { Select } from "./primitives/Select";
import { BitrateInput, SizeInput } from "./primitives/MeasureInput";
import { HdrInput } from "./primitives/HdrInput";
import {
  VIDEO_CODECS,
  AUDIO_CODECS,
  CHANNEL_LAYOUTS,
  SUBTITLE_TYPES,
  LANGUAGES,
  AUDIO_TRANSLATION_TYPES,
  getAudioProfilesForCodec,
} from "@/lib/dictionaries";
import type {
  AudioFormRow,
  SubtitleFormRow,
  VideoFieldState,
} from "@/lib/movie-form-types";
import { detectTranslationType } from "@/lib/channels";

interface TrackEditorSectionProps {
  video: VideoFieldState;
  onVideoChange: (patch: Partial<VideoFieldState>) => void;
  audioRows: AudioFormRow[];
  onUpdateAudio: (index: number, patch: Partial<AudioFormRow>) => void;
  onAddAudio: () => void;
  onRemoveAudio: (index: number) => void;
  onSetMainAudio?: (index: number) => void;
  subtitleRows: SubtitleFormRow[];
  onUpdateSubtitle: (index: number, patch: Partial<SubtitleFormRow>) => void;
  onAddSubtitle: () => void;
  onRemoveSubtitle: (index: number) => void;
  mainTrackStyle?: "star" | "checkbox";
  minAudioRows?: number;
  audioGridCols?: "two" | "three";
  showSectionTitle?: boolean;
  emptySubtitleMessage?: string;
  sections?: Array<"video" | "audio" | "subtitle">;
}

export function TrackEditorSection({
  video,
  onVideoChange,
  audioRows,
  onUpdateAudio,
  onAddAudio,
  onRemoveAudio,
  onSetMainAudio,
  subtitleRows,
  onUpdateSubtitle,
  onAddSubtitle,
  onRemoveSubtitle,
  mainTrackStyle = "checkbox",
  minAudioRows = 1,
  audioGridCols = "two",
  showSectionTitle = true,
  emptySubtitleMessage = "нет субтитров",
  sections = ["video", "audio", "subtitle"],
}: TrackEditorSectionProps) {
  const showVideo = sections.includes("video");
  const showAudio = sections.includes("audio");
  const showSubtitle = sections.includes("subtitle");
  const wrapperClass =
    showSectionTitle && sections.length === 3
      ? "surface-card space-y-8 p-5"
      : "space-y-8";

  const audioGridClass =
    audioGridCols === "three"
      ? "grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
      : "grid gap-3 sm:grid-cols-2";

  return (
    <div className={wrapperClass}>
      {showSectionTitle && sections.length === 3 ? (
        <h2 className="font-display text-xl font-semibold">Дорожки</h2>
      ) : null}

      {showVideo ? (
        <section>
          <h3 className="font-mono-tech mb-4 text-muted">видео</h3>
          <div className="surface-elevated space-y-4 p-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <Select
                label="Кодек"
                value={video.codec}
                onChange={(codec) => onVideoChange({ codec })}
                options={[{ value: "", label: "—" }, ...VIDEO_CODECS]}
                hint="Алгоритм сжатия видео: HEVC/H.265, H.264, AV1 и т.д. AV1 и HEVC эффективнее."
              />
              <Field
                label="FPS"
                value={video.fps}
                onChange={(e) => onVideoChange({ fps: e.target.value })}
                placeholder="23.976"
                hint="Кадров в секунду. Кино — 23.976, сериалы — 25/30, HFR — 48/60."
              />
            </div>
            <HdrInput
              value={video.hdr}
              onChange={(hdr) => onVideoChange({ hdr })}
            />
            <SizeInput
              width={video.width}
              height={video.height}
              resolutionLabel={video.resolutionLabel}
              onWidthChange={(width) => onVideoChange({ width })}
              onHeightChange={(height) => onVideoChange({ height })}
              onResolutionLabelChange={(resolutionLabel) =>
                onVideoChange({ resolutionLabel })
              }
            />
            <BitrateInput
              label="Битрейт видео"
              valueKbps={video.bitrate}
              onChange={(bitrate) => onVideoChange({ bitrate })}
              hint="Скорость видеопотока. Переключается между kbps и Mbps. Больше — выше качество при том же кодеке."
            />
          </div>
        </section>
      ) : null}

      {showAudio ? (
        <section>
        <h3 className="font-mono-tech mb-4 text-muted">аудиодорожки</h3>
        <div className="space-y-4">
          {audioRows.map((track, index) => {
            const profileOptions = getAudioProfilesForCodec(track.codec);
            const profileDisabled =
              profileOptions.length <= 1 ||
              (profileOptions.length === 1 &&
                profileOptions[0].value === "None");

            return (
              <div key={track.rowKey} className="surface-elevated space-y-3 p-4">
                <div className="flex items-center justify-between">
                  <span className="font-mono-tech text-faint">
                    дорожка {index + 1}
                  </span>
                  {audioRows.length > minAudioRows ? (
                    <button
                      type="button"
                      onClick={() => onRemoveAudio(index)}
                      aria-label="Удалить дорожку"
                      className="focus-ring rounded-md p-1.5 text-muted transition-colors hover:text-danger"
                    >
                      <Trash2 className="h-4 w-4" aria-hidden />
                    </button>
                  ) : null}
                </div>
                <div className={audioGridClass}>
                  <Select
                    label="Кодек"
                    value={track.codec}
                    onChange={(codec) => onUpdateAudio(index, { codec })}
                    options={[{ value: "", label: "—" }, ...AUDIO_CODECS]}
                    hint="Аудиоформат: TrueHD/E-AC3/AC3/DTS/AAC/FLAC… Определяет доступные профили."
                  />
                  <Select
                    label="Профиль"
                    value={track.profile}
                    onChange={(profile) => onUpdateAudio(index, { profile })}
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
                    value={track.channelLayout}
                    onChange={(channelLayout) =>
                      onUpdateAudio(index, { channelLayout })
                    }
                    options={[{ value: "", label: "—" }, ...CHANNEL_LAYOUTS]}
                    preserveOrder
                    hint="Расположение каналов: 2.0 (стерео), 5.1, 7.1…"
                  />
                  <Select
                    label="Язык"
                    value={track.language}
                    onChange={(language) => onUpdateAudio(index, { language })}
                    options={[{ value: "", label: "—" }, ...LANGUAGES]}
                    hint="Язык дорожки. Используется для фильтрации каталога."
                  />
                  <Select
                    label="Тип перевода"
                    value={track.translationType}
                    onChange={(translationType) =>
                      onUpdateAudio(index, { translationType })
                    }
                    options={[
                      { value: "", label: "—" },
                      ...AUDIO_TRANSLATION_TYPES,
                    ]}
                    hint="Дубляж, многоголосый, авторский, оригинал и т.д."
                  />
                  <BitrateInput
                    label="Битрейт"
                    valueKbps={track.bitrate}
                    onChange={(bitrate) => onUpdateAudio(index, { bitrate })}
                    hint="Скорость аудиопотока. Переключается kbps/Mbps."
                  />
                  <Field
                    label={mainTrackStyle === "star" ? "Название дорожки" : "Название"}
                    value={track.title}
                    onChange={(e) => {
                      const title = e.target.value;
                      const detected = detectTranslationType(title);
                      onUpdateAudio(index, {
                        title,
                        ...(detected ? { translationType: detected } : {}),
                      });
                    }}
                    placeholder={mainTrackStyle === "checkbox" ? "Surround 7.1" : undefined}
                  />
                </div>
                {mainTrackStyle === "star" && onSetMainAudio ? (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onSetMainAudio(index)}
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
                ) : (
                  <label className="flex cursor-pointer items-center gap-2 text-sm text-muted">
                    <input
                      type="checkbox"
                      checked={track.isDefault}
                      onChange={(e) =>
                        onUpdateAudio(index, { isDefault: e.target.checked })
                      }
                      className="h-4 w-4 accent-accent"
                    />
                    основная дорожка
                  </label>
                )}
              </div>
            );
          })}
          <Button variant="secondary" type="button" onClick={onAddAudio}>
            <Plus className="h-4 w-4" aria-hidden />
            Добавить дорожку
          </Button>
        </div>
      </section>
      ) : null}

      {showSubtitle ? (
      <section>
        <h3 className="font-mono-tech mb-4 text-muted">субтитры</h3>
        <div className="space-y-4">
          {subtitleRows.length === 0 ? (
            <p className="font-mono-tech text-sm text-faint">{emptySubtitleMessage}</p>
          ) : null}
          {subtitleRows.map((track, index) => (
            <div key={track.rowKey} className="surface-elevated space-y-3 p-4">
              <div className="flex items-center justify-between">
                <span className="font-mono-tech text-faint">
                  субтитры {index + 1}
                </span>
                <button
                  type="button"
                  onClick={() => onRemoveSubtitle(index)}
                  aria-label="Удалить субтитры"
                  className="focus-ring rounded-md p-1.5 text-muted transition-colors hover:text-danger"
                >
                  <Trash2 className="h-4 w-4" aria-hidden />
                </button>
              </div>
              <div className={audioGridClass}>
                <Select
                  label="Тип"
                  value={track.codecLabel}
                  onChange={(codecLabel) =>
                    onUpdateSubtitle(index, { codecLabel })
                  }
                  options={SUBTITLE_TYPES}
                  hint="Формат субтитров: SRT/ASS (текст), PGS/VobSub (графика) и т.д."
                />
                <Select
                  label="Язык"
                  value={track.language}
                  onChange={(language) => onUpdateSubtitle(index, { language })}
                  options={[{ value: "", label: "—" }, ...LANGUAGES]}
                  hint="Язык субтитров. Используется для фильтрации каталога."
                />
                <Field
                  label="Название"
                  value={track.title}
                  onChange={(e) =>
                    onUpdateSubtitle(index, { title: e.target.value })
                  }
                  placeholder="Full"
                />
                {mainTrackStyle === "star" ? (
                  <Select
                    label="Forced"
                    value={track.forced ? "yes" : "no"}
                    onChange={(value) =>
                      onUpdateSubtitle(index, { forced: value === "yes" })
                    }
                    preserveOrder
                    options={[
                      { value: "no", label: "Нет" },
                      { value: "yes", label: "Да" },
                    ]}
                    hint="Forced-субтитры показываются принудительно (например, перевод надписей в кадре)."
                  />
                ) : null}
              </div>
              {mainTrackStyle === "star" ? (
                <label className="flex cursor-pointer items-center gap-2 text-sm text-muted">
                  <input
                    type="checkbox"
                    checked={track.isDefault}
                    onChange={(e) =>
                      onUpdateSubtitle(index, { isDefault: e.target.checked })
                    }
                    className="h-4 w-4 accent-accent"
                  />
                  основные
                </label>
              ) : (
                <div className="flex gap-5">
                  <label className="flex cursor-pointer items-center gap-2 text-sm text-muted">
                    <input
                      type="checkbox"
                      checked={track.isDefault}
                      onChange={(e) =>
                        onUpdateSubtitle(index, { isDefault: e.target.checked })
                      }
                      className="h-4 w-4 accent-accent"
                    />
                    основные
                  </label>
                  <label className="flex cursor-pointer items-center gap-2 text-sm text-muted">
                    <input
                      type="checkbox"
                      checked={track.forced}
                      onChange={(e) =>
                        onUpdateSubtitle(index, { forced: e.target.checked })
                      }
                      className="h-4 w-4 accent-accent"
                    />
                    forced
                  </label>
                </div>
              )}
            </div>
          ))}
          <Button variant="secondary" type="button" onClick={onAddSubtitle}>
            <Plus className="h-4 w-4" aria-hidden />
            Добавить субтитры
          </Button>
        </div>
      </section>
      ) : null}
    </div>
  );
}
