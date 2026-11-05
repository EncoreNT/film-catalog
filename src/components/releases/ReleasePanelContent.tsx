"use client";

import { useCallback, useState } from "react";
import { AudioLines, Check, Copy, CopyPlus, ChevronDown, Waves, FileVideo, Captions } from "lucide-react";
import type { ReleaseDetailView } from "@/lib/releases/release-detail-view";
import { displayFileDir, displayFilePath } from "@/lib/shared/display-path";
import { ReleaseStorageBadge } from "@/components/releases/ReleaseStorageBadge";
import { ReleaseSpecHero } from "@/components/releases/ReleaseSpecHero";
import { TvReadyReleaseNotice, TvCompatibleTrackBadge } from "@/components/shared/TvReadyMark";
import { tagIcon } from "@/components/releases/ReleaseSpecRibbon";

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
    "movie-copy-button focus-ring";

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

function ReleaseFile({ release }: { release: ReleaseDetailView }) {
  const path = release.filePathDisplay;
  return (
    <section className="movie-file" aria-label="Файл релиза">
      {path ? (
        <details>
          <summary className="focus-ring" title={path}>
            <FileVideo size={15} aria-hidden />
            <span>{path.split(/[\\/]/).pop() || path}</span>
            <ChevronDown size={14} aria-hidden />
          </summary>
          <p className="movie-file-path">{path}</p>
          {release.filePath && <FilePathCopyButtons filePath={release.filePath} />}
        </details>
      ) : (
        <p className="movie-file-missing"><FileVideo size={15} aria-hidden /> Путь к файлу не указан</p>
      )}
      <div className="movie-file-meta">
        {release.storageLabel && <ReleaseStorageBadge label={release.storageLabel} external={release.storageExternal} />}
        {release.fileSizeLabel && <span>{release.fileSizeLabel}</span>}
        {release.fileDownloadedAtLabel && <span>Скачан {release.fileDownloadedAtLabel}</span>}
        {release.catalogAddedAtLabel && <span>В каталоге с {release.catalogAddedAtLabel}</span>}
      </div>
    </section>
  );
}

export function ReleasePanelContent({ release }: { release: ReleaseDetailView }) {
  const [section, setSection] = useState("audio");
  const sections = [
    { id: "audio", label: "Аудио", count: release.audioTracks.length, Icon: AudioLines },
    { id: "subs", label: "Субтитры", count: release.subtitleTracks.length, Icon: Captions },
  ];
  return (
    <div className="min-w-0">
      {release.showRibbon || release.video.hasData ? (
        <div className="movie-quality-row" key={`quality-${release.id}`}>
          <ReleaseSpecHero release={release} />
        </div>
      ) : null}

      {(release.tags.length > 0 || release.tvReady) && (
        <div className="movie-release-notes">
          {release.tags.length > 0 && (
            <div className="movie-characteristics" aria-label="Характеристики">
              {release.tags.map((tag, i) => <span title={tag.note} key={`${tag.kind}-${i}`}>{tagIcon(tag.kind)}{tag.label}</span>)}
            </div>
          )}
          {release.tvReady && <TvReadyReleaseNotice />}
        </div>
      )}
      <ReleaseFile key={`file-${release.id}`} release={release} />
      <div className="movie-section-tabs" role="group" aria-label="Дорожки релиза">
        <span aria-hidden className="movie-tab-backdrop" />
        {sections.map(({ id, label, count, Icon }) => (
          <button className="focus-ring" key={id} type="button" aria-pressed={section === id}
            onClick={() => setSection(id)}><Icon size={15} aria-hidden />{label} <small>{count}</small></button>
        ))}
      </div>
      <div className="min-w-0">
        <section hidden={section !== "audio"} className="min-w-0 pt-3">
          <h2 className="sr-only">Аудиодорожки</h2>
          {release.audioTracks.length === 0 ? (
            <p className="text-sm text-muted">Нет данных</p>
          ) : (
            <>
              <div className="movie-track-head" aria-hidden><span>Язык</span><span>Дорожка</span><span>Формат</span><span>Каналы</span><span>Битрейт</span></div>
              <ul className="movie-audio-tracks">
                {release.audioTracks.map((track) => (
                  <li key={track.id} data-default={track.isDefault}>
                    <span className="movie-track-lang">{track.langLabel ?? "—"}</span>
                    <div className="movie-track-name">
                      <b>{track.title || track.translation || "Аудиодорожка"}</b>
                      <small>{[track.title && track.translation, track.isDefault && "главная дорожка"].filter(Boolean).join(" · ")}</small>
                    </div>
                    <div className="movie-track-format">
                      {track.formatLabel ? (
                        <span className={track.is3D ? "movie-spatial-format" : undefined} title={track.codecFullLabel ?? undefined}>
                          {track.is3D && <Waves size={14} aria-hidden />}{track.formatLabel}
                        </span>
                      ) : "—"}
                      {track.tvCompatible && track.languageCode === "rus" && <TvCompatibleTrackBadge />}
                    </div>
                    <span className="movie-track-channels" title="Каналы">{track.channelLayout ?? "—"}</span>
                    <span className="movie-track-rate" title="Битрейт">{track.bitrate ?? "—"}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>

        <section hidden={section !== "subs"} className="min-w-0 pt-3">
          <h2 className="sr-only">Субтитры</h2>
          {release.subtitleTracks.length === 0 ? (
            <p className="text-sm text-muted">Нет субтитров</p>
          ) : (
            <ul className="movie-subtitles">
              {release.subtitleTracks.map((track) => (
                <li key={track.id}>
                  <span className="movie-track-lang">{track.language?.toUpperCase() ?? "—"}</span>
                  <b>{track.title ?? "Субтитры"}</b>
                  <small>{track.forced && "Форсированные"}</small>
                  <span>{track.codecLabel ?? "—"}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

      </div>
    </div>
  );
}
