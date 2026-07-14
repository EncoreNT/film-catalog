"use client";

import { useState } from "react";
import { Plus, Star, Trash2 } from "lucide-react";
import { motion } from "motion/react";
import { Button } from "@/components/primitives/Button";
import { Field } from "@/components/primitives/Field";
import { MachinedCard, CardSectionHeader } from "@/components/primitives/MachinedCard";
import { Select } from "@/components/primitives/Select";
import { BitrateInput, SizeInput } from "@/components/primitives/MeasureInput";
import { HdrInput } from "@/components/primitives/HdrInput";
import {
  VIDEO_CODECS,
  AUDIO_CODECS,
  CHANNEL_LAYOUTS,
  SUBTITLE_TYPES,
  LANGUAGES,
  AUDIO_TRANSLATION_TYPES,
  getAudioProfilesForCodec,
} from "@/lib/shared/dictionaries";
import type {
  AudioFormRow,
  SubtitleFormRow,
  VideoFieldState,
} from "@/lib/movies/movie-form-types";
import { detectTranslationType } from "@/lib/media/channels";

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
  audioGridCols?: "two" | "three" | "adaptive";
  showSectionTitle?: boolean;
  emptySubtitleMessage?: string;
  sections?: Array<"video" | "audio" | "subtitle">;
  /** default — spacious; balanced — release editor; compact — dense panels */
  variant?: "default" | "balanced" | "compact";
  /** lg+: video in a sticky left column; audio and subtitles on the right. */
  splitColumns?: boolean;
  /** xl+: two-column grid inside the video block (when not splitColumns). */
  videoColumnsOnXl?: boolean;
  /** Tabs for video / audio / subtitles instead of a long vertical stack. */
  tabbed?: boolean;
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
  variant = "default",
  splitColumns = false,
  videoColumnsOnXl = false,
  tabbed = false,
}: TrackEditorSectionProps) {
  const showVideo = sections.includes("video");
  const showAudio = sections.includes("audio");
  const showSubtitle = sections.includes("subtitle");
  const hideSectionHeading = tabbed;
  const isCompact = variant === "compact";
  const isBalanced = variant === "balanced";
  const sectionGap = isCompact
    ? "space-y-5"
    : isBalanced
      ? "space-y-6"
      : "space-y-8";
  const headingMb = isCompact ? "mb-2.5" : isBalanced ? "mb-3" : "mb-4";
  const elevatedPad = isCompact ? "p-3" : "p-4";
  const elevatedGap = isCompact ? "space-y-3" : "space-y-4";
  const trackListGap = isCompact ? "space-y-3" : "space-y-4";
  const wrapperClass =
    showSectionTitle && sections.length === 3
      ? `surface-card ${sectionGap} ${
          isCompact ? "p-4 sm:p-5" : isBalanced ? "p-5 sm:p-6" : "p-5"
        }`
      : sectionGap;

  const audioGridClass =
    audioGridCols === "three"
      ? "grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
      : audioGridCols === "adaptive"
        ? "grid gap-3 sm:grid-cols-2 xl:grid-cols-3"
        : "grid gap-3 sm:grid-cols-2";

  const videoFieldsInner = (
    <>
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
    </>
  );

  const videoFieldsBody =
    videoColumnsOnXl && !splitColumns ? (
      <div className={`${elevatedGap} xl:grid xl:grid-cols-2 xl:gap-x-6`}>
        <div className={elevatedGap}>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
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
        </div>
        <div className={elevatedGap}>
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
      </div>
    ) : (
      <div className={elevatedGap}>{videoFieldsInner}</div>
    );

  const videoSection = showVideo ? (
    <section className={splitColumns ? "lg:sticky lg:top-24" : undefined}>
      {!hideSectionHeading ? (
        <h3 className={`font-mono-tech ${headingMb} text-muted`}>видео</h3>
      ) : null}
      {tabbed ? (
        videoFieldsBody
      ) : (
        <div className={`surface-elevated ${elevatedPad}`}>{videoFieldsBody}</div>
      )}
    </section>
  ) : null;

  const audioSection = showAudio ? (
    <section>
      {!hideSectionHeading ? (
        <h3 className={`font-mono-tech ${headingMb} text-muted`}>аудиодорожки</h3>
      ) : null}
      <div className={trackListGap}>
        {audioRows.map((track, index) => {
          const profileOptions = getAudioProfilesForCodec(track.codec);
          const profileDisabled =
            profileOptions.length <= 1 ||
            (profileOptions.length === 1 &&
              profileOptions[0].value === "None");

          return (
            <div
              key={track.rowKey}
              className={`surface-elevated space-y-3 ${elevatedPad}`}
            >
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
                  label={
                    mainTrackStyle === "star" ? "Название дорожки" : "Название"
                  }
                  value={track.title}
                  onChange={(e) => {
                    const title = e.target.value;
                    const detected = detectTranslationType(title);
                    onUpdateAudio(index, {
                      title,
                      ...(detected ? { translationType: detected } : {}),
                    });
                  }}
                  placeholder={
                    mainTrackStyle === "checkbox" ? "Surround 7.1" : undefined
                  }
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
  ) : null;

  const subtitleSection = showSubtitle ? (
    <section>
      {!hideSectionHeading ? (
        <h3 className={`font-mono-tech ${headingMb} text-muted`}>субтитры</h3>
      ) : null}
      <div className={trackListGap}>
        {subtitleRows.length === 0 ? (
          <p className="font-mono-tech text-sm text-faint">
            {emptySubtitleMessage}
          </p>
        ) : null}
        {subtitleRows.map((track, index) => (
          <div
            key={track.rowKey}
            className={`surface-elevated space-y-3 ${elevatedPad}`}
          >
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
  ) : null;

  const tracksBody =
    splitColumns && showVideo ? (
      <div className="grid gap-5 lg:grid-cols-[minmax(280px,360px)_minmax(0,1fr)] lg:items-start lg:gap-6">
        {videoSection}
        <div className={sectionGap}>
          {audioSection}
          {subtitleSection}
        </div>
      </div>
    ) : (
      <>
        {videoSection}
        {audioSection}
        {subtitleSection}
      </>
    );

  type TrackTab = "video" | "audio" | "subtitle";
  const tabItems: { id: TrackTab; label: string }[] = [];
  if (showVideo) tabItems.push({ id: "video", label: "Видео" });
  if (showAudio) {
    tabItems.push({
      id: "audio",
      label: audioRows.length > 0 ? `Аудио · ${audioRows.length}` : "Аудио",
    });
  }
  if (showSubtitle) {
    tabItems.push({
      id: "subtitle",
      label:
        subtitleRows.length > 0
          ? `Субтитры · ${subtitleRows.length}`
          : "Субтитры",
    });
  }

  const [activeTab, setActiveTab] = useState<TrackTab>(
    () => tabItems[0]?.id ?? "video",
  );
  const resolvedTab = tabItems.some((t) => t.id === activeTab)
    ? activeTab
    : (tabItems[0]?.id ?? "video");

  if (tabbed && tabItems.length > 0) {
    return (
      <MachinedCard>
        {showSectionTitle ? (
          <CardSectionHeader label="содержимое" title="Дорожки" />
        ) : null}
        <div
          className={`${showSectionTitle ? "mt-5" : ""} flex gap-1 border-b border-border`}
          role="tablist"
          aria-label="Дорожки"
        >
          {tabItems.map((tab) => {
            const active = tab.id === resolvedTab;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                id={`track-tab-${tab.id}`}
                aria-selected={active}
                aria-controls={`track-panel-${tab.id}`}
                onClick={() => setActiveTab(tab.id)}
                className={`focus-ring font-mono-tech relative inline-flex items-center px-3 py-2 text-xs font-medium transition-colors ${
                  active ? "text-accent" : "text-muted hover:text-text"
                }`}
              >
                {tab.label}
                {active ? (
                  <motion.span
                    layoutId="track-tab-underline"
                    className="pointer-events-none absolute inset-x-2 bottom-[-1px] h-[2px] rounded-full bg-gradient-to-r from-transparent via-accent to-accent-bright shadow-[0_0_10px_var(--accent-glow)]"
                    transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                    aria-hidden
                  />
                ) : null}
              </button>
            );
          })}
        </div>
        <div
          role="tabpanel"
          id={`track-panel-${resolvedTab}`}
          aria-labelledby={`track-tab-${resolvedTab}`}
          className="pt-5 sm:pt-6"
        >
          {resolvedTab === "video" ? videoSection : null}
          {resolvedTab === "audio" ? audioSection : null}
          {resolvedTab === "subtitle" ? subtitleSection : null}
        </div>
      </MachinedCard>
    );
  }

  return (
    <div className={wrapperClass}>
      {showSectionTitle && sections.length === 3 ? (
        <h2
          className={`font-display font-semibold ${
            isCompact ? "text-lg" : "text-xl"
          }`}
        >
          Дорожки
        </h2>
      ) : null}
      {tracksBody}
    </div>
  );
}
