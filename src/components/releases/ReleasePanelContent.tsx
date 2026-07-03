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
    <div className="space-y-6">
      {release.showRibbon ? <SpecRibbon release={release} /> : null}

      {release.tags.length > 0 ? (
        <div>
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

      <section>
        <h2 className="font-mono-tech mb-4 text-muted">видео</h2>
        {release.video.hasData ? (
          <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <div className="col-span-2 sm:col-span-1">
              <dt className="font-mono-tech text-faint">битрейт</dt>
              <dd className="mt-1.5 flex items-baseline gap-1.5">
                <span className="font-mono text-2xl font-medium leading-none text-text">
                  {release.video.vBitrateValue ?? "—"}
                </span>
                {release.video.vBitrateUnit ? (
                  <span className="font-mono text-xs text-muted">
                    {release.video.vBitrateUnit}
                  </span>
                ) : null}
              </dd>
            </div>
            <div className="col-span-1">
              <dt className="font-mono-tech text-faint">кодек</dt>
              <dd className="font-mono mt-1.5 text-sm text-muted">
                {release.video.codec ?? "—"}
              </dd>
            </div>
            <div className="col-span-1">
              <dt className="font-mono-tech text-faint">fps</dt>
              <dd className="font-mono mt-1.5 text-sm text-muted">
                {release.video.fps ?? "—"}
              </dd>
            </div>
          </dl>
        ) : (
          <p className="text-sm text-muted">Нет данных</p>
        )}
      </section>

      <section className="border-t border-border pt-6">
        <h2 className="font-mono-tech mb-4 text-muted">аудиодорожки</h2>
        {release.audioTracks.length === 0 ? (
          <p className="text-sm text-muted">Нет данных</p>
        ) : (
          <div className="space-y-1">
            <div
              className="font-mono-tech grid grid-cols-[20px_56px_minmax(96px,1fr)_minmax(110px,1.4fr)_60px_72px] items-center gap-x-2 gap-y-1 border-b border-border pb-2 text-faint"
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
                className="border-b border-border/60 py-2.5 last:border-0 last:pb-1"
              >
                <div className="grid grid-cols-[20px_56px_minmax(96px,1fr)_minmax(110px,1.4fr)_60px_72px] items-center gap-x-2 gap-y-1">
                  <span className="flex items-center">
                    {track.isDefault ? (
                      <Star
                        className="h-3.5 w-3.5 fill-accent text-accent"
                        aria-label="Главная дорожка"
                      />
                    ) : null}
                  </span>
                  <span className="flex items-center">
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
                  <span className="flex items-center">
                    {track.translation ? (
                      <span className="font-mono-tech rounded-md border border-border bg-bg-surface px-2 py-1 text-[0.65rem] text-muted">
                        {track.translation}
                      </span>
                    ) : (
                      <span className="font-mono text-sm text-faint">—</span>
                    )}
                  </span>
                  <span className="flex items-center">
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
                  <span className="flex items-center">
                    {track.channelLayout ? (
                      <SpecTag kind="channel">{track.channelLayout}</SpecTag>
                    ) : (
                      <span className="font-mono text-sm text-faint">—</span>
                    )}
                  </span>
                  <span className="font-mono text-right text-xs text-muted tabular-nums">
                    {track.bitrate ?? "—"}
                  </span>
                </div>
                {track.title ? (
                  <p
                    className="font-mono-tech mt-1 truncate pl-[78px] text-xs text-faint"
                    title={track.title}
                  >
                    {track.title}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="border-t border-border pt-6">
        <h2 className="font-mono-tech mb-4 text-muted">субтитры</h2>
        {release.subtitleTracks.length === 0 ? (
          <p className="text-sm text-muted">Нет субтитров</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {release.subtitleTracks.map((track) => (
              <li
                key={track.id}
                className="flex flex-wrap items-center gap-2"
              >
                <span className="font-mono-tech text-text">
                  {track.codecLabel ?? "—"}
                </span>
                <span className="text-muted">·</span>
                <span>{track.language ?? "—"}</span>
                {track.forced ? (
                  <span className="font-mono-tech text-accent">forced</span>
                ) : null}
                {track.title ? (
                  <span
                    className="font-mono-tech truncate text-faint"
                    title={track.title}
                  >
                    · {track.title}
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="border-t border-border pt-6">
        <h2 className="font-mono-tech mb-4 text-muted">файл</h2>
        {release.filePathDisplay ? (
          <>
            <p className="break-all text-xs text-muted">{release.filePathDisplay}</p>
            {release.filePath ? (
              <FilePathCopyButtons filePath={release.filePath} />
            ) : null}
          </>
        ) : (
          <p className="font-mono-tech text-xs text-faint">путь не указан</p>
        )}
        {release.fileSizeLabel ? (
          <p className="font-mono-tech mt-2 text-xs text-muted">
            {release.fileSizeLabel}
          </p>
        ) : null}
        {release.storageLabel ? (
          <ReleaseStorageBadge
            label={release.storageLabel}
            external={release.storageExternal}
          />
        ) : null}
        <p className="font-mono-tech mt-2 text-xs text-muted">
          добавлен {release.createdAtLabel} · обновлён {release.updatedAtLabel}
        </p>
      </section>
    </div>
  );
}
