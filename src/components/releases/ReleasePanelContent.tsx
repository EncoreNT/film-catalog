"use client";

import { type ReactNode, useCallback, useState } from "react";
import { AudioLines, Check, Copy, CopyPlus, Waves } from "lucide-react";
import type { ReleaseDetailView } from "@/lib/releases/release-detail-view";
import { displayFileDir, displayFilePath } from "@/lib/shared/display-path";
import { SpecTag } from "@/components/shared/SpecTag";
import { ReleaseStorageBadge } from "@/components/releases/ReleaseStorageBadge";
import { ReleaseSpecHero } from "@/components/releases/ReleaseSpecHero";
import { TvReadyReleaseNotice } from "@/components/shared/TvReadyMark";
import { tagIcon } from "@/components/releases/ReleaseSpecRibbon";

type CopyTarget = "file" | "dir";

/** Six-column audio track grid — shared by the header and every row so the
    columns line up. Default-rail · language · translation · format · channels · bitrate. */
const AUDIO_GRID =
  "grid-cols-[16px_56px_minmax(0,1fr)_minmax(0,1.2fr)_56px_64px]";

function FilePathCopyButtons({ filePath }: { filePath: string }) {
  const [copied, setCopied] = useState<CopyTarget | null>(null);

  const fullPath = displayFilePath(filePath);
  const dirPath = displayFileDir(filePath);

  const copy = useCallback(async (text: string, target: CopyTarget) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(target);
      window.setTimeout(() => setCopied(null), 2000);
    } catch {
      // Clipboard may be blocked without a secure context or permission.
    }
  }, []);

  const buttonClass =
    "focus-ring font-mono-tech inline-flex min-h-8 items-center gap-1.5 rounded-[var(--radius-sm)] border border-border-strong bg-bg-surface px-2.5 py-1.5 text-[11px] text-muted transition-colors hover:border-accent/40 hover:text-accent disabled:opacity-40";

  return (
    <div className="mt-3 flex flex-wrap gap-2">
      <button
        type="button"
        className={buttonClass}
        onClick={() => void copy(fullPath, "file")}
      >
        {copied === "file" ? (
          <Check className="h-3.5 w-3.5 text-accent" aria-hidden />
        ) : (
          <Copy className="h-3.5 w-3.5" aria-hidden />
        )}
        {copied === "file" ? "скопировано" : "скопировать путь"}
      </button>
      <button
        type="button"
        className={buttonClass}
        onClick={() => void copy(dirPath, "dir")}
      >
        {copied === "dir" ? (
          <Check className="h-3.5 w-3.5 text-accent" aria-hidden />
        ) : (
          <CopyPlus className="h-3.5 w-3.5" aria-hidden />
        )}
        {copied === "dir" ? "скопировано" : "скопировать папку"}
      </button>
    </div>
  );
}

function VideoSpecCell({
  label,
  value,
}: {
  label: string;
  value: string | null;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <dt className="font-mono-tech text-faint">{label}</dt>
      <dd className="font-mono text-sm text-text tabular-nums">{value}</dd>
    </div>
  );
}

/** Medium "spec chip" for the characteristics row (BDRemux, звук 7.1 …).
    Deliberately a middle tier: clearly larger and more legible than the
    inline SpecTag pills used inside the audio table, but smaller than the
    hero plaques above, so the hierarchy reads plaques → characteristics →
    inline audio badges. */
function CharacteristicChip({
  icon,
  children,
}: {
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <span className="font-mono inline-flex items-center gap-2 rounded-[var(--radius-sm)] border border-border-strong bg-bg-elevated/60 px-3 py-1.5 text-xs text-text shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] transition-colors hover:border-accent/35 hover:bg-bg-surface">
      <span className="flex shrink-0 items-center text-muted" aria-hidden>
        {icon}
      </span>
      <span>{children}</span>
    </span>
  );
}

export function ReleasePanelContent({ release }: { release: ReleaseDetailView }) {
  return (
    <div className="min-w-0">
      {release.showRibbon ? (
        <div className="mb-6">
          <ReleaseSpecHero release={release} />
        </div>
      ) : null}

      {release.tvReady ? (
        <div className="mb-6">
          <TvReadyReleaseNotice />
        </div>
      ) : null}

      {release.tags.length > 0 ? (
        <div className="mb-6">
          <p className="font-mono-tech mb-2.5 text-faint">характеристики</p>
          <div className="flex flex-wrap gap-2">
            {release.tags.map((tag, i) => (
              <CharacteristicChip
                key={`${tag.kind}-${tag.label}-${i}`}
                icon={tagIcon(tag.kind)}
              >
                {tag.label}
              </CharacteristicChip>
            ))}
          </div>
        </div>
      ) : null}

      {/* Console: a vertical flow of full-width sections separated by
         hairline dividers. The hero plaques above own the premium-spec
         showcase; below is the flat technical readout — video signal,
         audio tracks, subtitles, file provenance. DOM order is the
         reading order on every breakpoint. */}
      <div className="min-w-0">
        <section className="pt-0">
          <h2 className="font-mono-tech mb-4 text-muted">видео</h2>
          {release.video.hasData ? (
            <div className="relative overflow-hidden rounded-[var(--radius)] border border-border/60 bg-bg-elevated/75 p-4 sm:p-5">
              {/* Calibration scan sweep — a slow cyan probe travelling the
                 signal readout. Decorative; hidden under reduced motion. */}
              <div
                className="laser-scan-line pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan/50 to-transparent"
                aria-hidden
              />
              <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:gap-6">
                {/* Bitrate hero — the marquee number, kept medium so it
                   reads as an instrument readout, not a giant billboard. */}
                <div className="flex shrink-0 flex-col gap-1.5">
                  <span className="font-mono-tech text-faint">битрейт</span>
                  <div className="flex items-baseline gap-1.5">
                    <span className="font-mono text-3xl font-medium leading-none tracking-tight text-text tabular-nums drop-glow-accent sm:text-4xl">
                      {release.video.vBitrateValue ?? "—"}
                    </span>
                    {release.video.vBitrateUnit ? (
                      <span className="font-mono text-sm text-muted">
                        {release.video.vBitrateUnit}
                      </span>
                    ) : null}
                  </div>
                </div>
                {/* Spec cells — codec / fps. Resolution lives up in the hero
                   plaque (with its long-form label), so it is not repeated here. */}
                <dl className="grid grid-cols-2 gap-x-4 gap-y-2 border-t border-border/60 pt-4 sm:flex-1 sm:border-l sm:border-t-0 sm:pl-6 sm:pt-0">
                  <VideoSpecCell label="кодек" value={release.video.codec} />
                  <VideoSpecCell label="fps" value={release.video.fps} />
                </dl>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted">Нет данных</p>
          )}
        </section>

        <section className="min-w-0 border-t border-border/70 pt-5">
          <h2 className="font-mono-tech mb-4 text-muted">аудиодорожки</h2>
          {release.audioTracks.length === 0 ? (
            <p className="text-sm text-muted">Нет данных</p>
          ) : (
            <div className="min-w-0 space-y-1">
              <div
                className={`font-mono-tech grid ${AUDIO_GRID} items-center gap-x-2 gap-y-1 border-b border-border pb-2 text-faint`}
                aria-hidden
              >
                <span />
                <span>язык</span>
                <span>перевод</span>
                <span>формат</span>
                <span>каналы</span>
                <span className="text-right">битрейт</span>
              </div>
              {release.audioTracks.map((track) => (
                <div
                  key={track.id}
                  className={`relative min-w-0 border-b border-border/60 py-2.5 transition-colors last:border-0 last:pb-1 hover:bg-bg-surface/30 ${
                    track.isDefault
                      ? "bg-gradient-to-r from-accent/[0.10] via-accent/[0.03] to-transparent"
                      : ""
                  }`}
                >
                  {/* Default-track accent: a full-height gold rail with a
                     soft glow plus a gold wash — the row reads as the main
                     track without a redundant star icon. */}
                  {track.isDefault ? (
                    <span
                      className="glow-accent-10 absolute left-0 top-0 bottom-0 w-[2px] bg-accent"
                      aria-hidden
                    />
                  ) : null}
                  <div
                    className={`grid ${AUDIO_GRID} items-center gap-x-2 gap-y-1`}
                  >
                    {/* Rail lane — empty spacer reserving room for the gold
                       bar so it never collides with the language cell. */}
                    <span aria-hidden />
                    <span className="flex min-w-0 items-center">
                      {track.langLabel ? (
                        <span
                          className={`font-mono rounded-md px-2 py-1 text-xs tracking-wide ${
                            track.languageCode === "rus"
                              ? "bg-bg-elevated text-text"
                              : "text-muted"
                          }`}
                        >
                          {track.langLabel}
                        </span>
                      ) : (
                        <span className="font-mono text-sm text-faint">—</span>
                      )}
                    </span>
                    <span className="flex min-w-0 items-center">
                      {track.translation ? (
                        <span
                          className="font-mono-tech max-w-full truncate rounded-md border border-border bg-bg-surface px-2 py-1 text-[0.65rem] text-muted"
                          title={track.translation}
                        >
                          {track.translation}
                        </span>
                      ) : (
                        <span className="font-mono text-sm text-faint">—</span>
                      )}
                    </span>
                    <span className="flex min-w-0 items-center overflow-hidden">
                      {track.formatLabel ? (
                        <SpecTag
                          kind={track.is3D ? "audio-3d" : "audio"}
                          icon={
                            track.is3D ? (
                              <Waves className="h-3 w-3" />
                            ) : (
                              <AudioLines className="h-3 w-3" />
                            )
                          }
                          note={track.codecFullLabel ?? undefined}
                        >
                          {track.formatLabel}
                        </SpecTag>
                      ) : (
                        <span className="font-mono text-sm text-faint">—</span>
                      )}
                    </span>
                    <span className="flex min-w-0 items-center">
                      {track.channelLayout ? (
                        <SpecTag kind="channel">{track.channelLayout}</SpecTag>
                      ) : (
                        <span className="font-mono text-sm text-faint">—</span>
                      )}
                    </span>
                    <span className="font-mono min-w-0 truncate text-right text-xs text-muted tabular-nums">
                      {track.bitrate ?? "—"}
                    </span>
                    {track.isDefault || track.title ? (
                      <p className="font-mono-tech col-span-full mt-1 min-w-0 truncate pl-4 text-xs">
                        {track.isDefault ? (
                          <span className="text-accent/80">главная дорожка</span>
                        ) : null}
                        {track.isDefault && track.title ? (
                          <span className="text-faint"> · </span>
                        ) : null}
                        {track.title ? (
                          <span className="text-faint" title={track.title}>
                            {track.title}
                          </span>
                        ) : null}
                      </p>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="min-w-0 border-t border-border/70 pt-5">
          <h2 className="font-mono-tech mb-4 text-muted">
            субтитры
            {release.subtitleTracks.length > 0
              ? ` · ${release.subtitleTracks.length}`
              : ""}
          </h2>
          {release.subtitleTracks.length === 0 ? (
            <p className="text-sm text-muted">Нет субтитров</p>
          ) : (
            <ul className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2 xl:grid-cols-3">
              {release.subtitleTracks.map((track) => (
                <li
                  key={track.id}
                  className="flex min-w-0 items-center gap-2 rounded-[var(--radius-sm)] border border-border/60 bg-bg-surface/40 px-2.5 py-1.5 transition-colors hover:border-accent/30 hover:bg-bg-surface/70"
                >
                  <span className="font-mono-tech shrink-0 text-text">
                    {track.codecLabel ?? "—"}
                  </span>
                  <span className="min-w-0 truncate text-muted">
                    {track.language ?? "—"}
                  </span>
                  {track.forced ? (
                    <span className="font-mono-tech shrink-0 text-accent">
                      forced
                    </span>
                  ) : null}
                  {track.title ? (
                    <span
                      className="font-mono-tech ml-auto shrink-0 truncate text-faint"
                      title={track.title}
                    >
                      {track.title}
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="min-w-0 border-t border-border/70 pt-5">
          <h2 className="font-mono-tech mb-4 text-muted">файл</h2>
          {release.storageLabel ||
          release.fileSizeLabel ||
          release.createdAtLabel ||
          release.updatedAtLabel ? (
            <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-2">
              {release.storageLabel ? (
                <ReleaseStorageBadge
                  label={release.storageLabel}
                  external={release.storageExternal}
                />
              ) : null}
              {release.fileSizeLabel ? (
                <span className="font-mono-tech text-faint">
                  размер{" "}
                  <span className="font-mono text-sm text-text tabular-nums">
                    {release.fileSizeLabel}
                  </span>
                </span>
              ) : null}
              {release.createdAtLabel ? (
                <span className="font-mono-tech text-faint">
                  добавлен{" "}
                  <span className="font-mono text-sm text-muted">
                    {release.createdAtLabel}
                  </span>
                </span>
              ) : null}
              {release.updatedAtLabel ? (
                <span className="font-mono-tech text-faint">
                  обновлён{" "}
                  <span className="font-mono text-sm text-muted">
                    {release.updatedAtLabel}
                  </span>
                </span>
              ) : null}
            </div>
          ) : null}
          {release.filePathDisplay ? (
            <>
              <p className="break-all text-xs text-muted">
                {release.filePathDisplay}
              </p>
              {release.filePath ? (
                <FilePathCopyButtons filePath={release.filePath} />
              ) : null}
            </>
          ) : (
            <p className="font-mono-tech text-xs text-faint">путь не указан</p>
          )}
        </section>
      </div>
    </div>
  );
}
