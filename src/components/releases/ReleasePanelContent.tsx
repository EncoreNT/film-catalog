"use client";

import { useCallback, useState } from "react";
import { Check, Copy, CopyPlus, Star, Waves } from "lucide-react";
import type { ReleaseDetailView } from "@/lib/releases/release-detail-view";
import { displayFileDir, displayFilePath } from "@/lib/shared/display-path";
import { SpecTag } from "@/components/shared/SpecTag";
import { ReleaseStorageBadge } from "@/components/releases/ReleaseStorageBadge";
import { SpecRibbon, tagIcon } from "@/components/releases/ReleaseSpecRibbon";

type CopyTarget = "file" | "dir";

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

export function ReleasePanelContent({ release }: { release: ReleaseDetailView }) {
  return (
    <div className="min-w-0">
      {release.showRibbon ? (
        <div className="mb-5">
          <SpecRibbon release={release} />
        </div>
      ) : null}

      {release.tags.length > 0 ? (
        <div className="mb-5">
          <p className="font-mono-tech mb-2 text-faint">характеристики</p>
          <div className="flex flex-wrap gap-2">
            {release.tags.map((tag, i) => (
              <SpecTag
                key={`${tag.kind}-${tag.label}-${i}`}
                kind={tag.kind}
                icon={tagIcon(tag.kind)}
                note={tag.note}
              >
                {tag.label}
              </SpecTag>
            ))}
          </div>
        </div>
      ) : null}

      {/* Console: a vertical flow of full-width sections separated by
         hairline dividers. Each section owns its own height - the video
         block no longer stretches to match a long subtitle list, and the
         file + storage meta live in one merged provenance block instead
         of two split cards with dead space. DOM order is the reading
         order on every breakpoint: video, audio, subtitles, file. */}
      <div className="min-w-0">
        <section className="pt-0">
          <h2 className="font-mono-tech mb-4 text-muted">видео</h2>
          {release.video.hasData ? (
            <div className="flex flex-col gap-4 sm:max-w-xl sm:flex-row sm:items-end sm:gap-8">
              <div className="flex shrink-0 items-baseline gap-2">
                <span className="font-mono text-4xl font-medium leading-none tracking-tight text-text tabular-nums sm:text-5xl">
                  {release.video.vBitrateValue ?? "—"}
                </span>
                {release.video.vBitrateUnit ? (
                  <span className="font-mono text-sm text-muted">
                    {release.video.vBitrateUnit}
                  </span>
                ) : null}
              </div>
              <dl className="grid grid-cols-3 gap-x-6 gap-y-2 sm:flex-1">
                <div className="flex flex-col gap-1.5">
                  <dt className="font-mono-tech text-faint">кодек</dt>
                  <dd className="font-mono text-sm text-text">
                    {release.video.codec ?? "—"}
                  </dd>
                </div>
                <div className="flex flex-col gap-1.5">
                  <dt className="font-mono-tech text-faint">fps</dt>
                  <dd className="font-mono text-sm text-text tabular-nums">
                    {release.video.fps ?? "—"}
                  </dd>
                </div>
                <div className="flex flex-col gap-1.5">
                  <dt className="font-mono-tech text-faint">разрешение</dt>
                  <dd className="font-mono text-sm text-text">
                    {release.video.resolution}
                  </dd>
                </div>
              </dl>
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
                className="font-mono-tech grid grid-cols-[20px_56px_minmax(0,1fr)_minmax(0,1.2fr)_56px_64px] items-center gap-x-2 gap-y-1 border-b border-border pb-2 text-faint"
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
                  className="min-w-0 border-b border-border/60 py-2.5 last:border-0 last:pb-1"
                >
                  <div className="grid grid-cols-[20px_56px_minmax(0,1fr)_minmax(0,1.2fr)_56px_64px] items-center gap-x-2 gap-y-1">
                    <span className="flex items-center">
                      {track.isDefault ? (
                        <Star
                          className="h-3.5 w-3.5 fill-accent text-accent"
                          aria-label="Главная дорожка"
                        />
                      ) : null}
                    </span>
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
                        track.is3D ? (
                          <SpecTag
                            kind="audio-3d"
                            icon={<Waves className="h-3.5 w-3.5" />}
                            note={track.codecFullLabel ?? undefined}
                          >
                            {track.formatLabel}
                          </SpecTag>
                        ) : (
                          <SpecTag
                            kind="audio"
                            note={track.codecFullLabel ?? undefined}
                          >
                            {track.formatLabel}
                          </SpecTag>
                        )
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
                    {track.title ? (
                      <p
                        className="font-mono-tech col-span-full mt-0.5 min-w-0 truncate pl-7 text-xs text-faint"
                        title={track.title}
                      >
                        {track.title}
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
                  className="flex min-w-0 items-center gap-2 rounded-[var(--radius-sm)] border border-border/60 bg-bg-surface/40 px-2.5 py-1.5"
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
