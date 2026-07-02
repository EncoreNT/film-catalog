"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  AudioLines,
  Check,
  Copy,
  CopyPlus,
  Disc3,
  Layers,
  Menu,
  MonitorPlay,
  Pencil,
  Plus,
  ScanSearch,
  Star,
  Sun,
  Trash2,
  Waves,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import type { ReleaseDetailView } from "@/lib/release-detail-view";
import { displayFileDir, displayFilePath } from "@/lib/display-path";
import { SpecTag } from "./SpecTag";
import { ConfirmDialog } from "./primitives/ConfirmDialog";

interface MovieReleasePanelProps {
  movieId: number;
  movieSlug: string;
  releases: ReleaseDetailView[];
  initialActiveReleaseId: number;
}

function tagIcon(kind: ReleaseDetailView["tags"][number]["kind"]) {
  switch (kind) {
    case "resolution":
      return <MonitorPlay className="h-3.5 w-3.5" />;
    case "hdr":
      return <Sun className="h-3.5 w-3.5" />;
    case "audio-3d":
      return <Waves className="h-3.5 w-3.5" />;
    case "audio":
      return <AudioLines className="h-3.5 w-3.5" />;
    case "channel":
      return <AudioLines className="h-3.5 w-3.5" />;
    case "release":
      return <Disc3 className="h-3.5 w-3.5" />;
    case "version":
      return <Layers className="h-3.5 w-3.5" />;
    default:
      return null;
  }
}

function SpecRibbon({ release }: { release: ReleaseDetailView }) {
  const hasResolution = release.video.resolution && release.video.resolution !== "—";

  return (
    <div className="flex flex-wrap items-center gap-2.5 border-b border-accent/15 pb-5">
      {hasResolution ? (
        <span
          className={`inline-flex items-baseline gap-1.5 rounded-md border px-2.5 py-1 ${
            release.premium4K
              ? "border-accent/45 bg-accent/10 shadow-[0_0_14px_var(--accent-glow)]"
              : "border-border-strong bg-bg-elevated"
          }`}
        >
          <span
            className={`font-display text-base font-semibold leading-none ${
              release.premium4K ? "text-accent-bright" : "text-text"
            }`}
          >
            {release.video.resolution}
          </span>
          {release.vPixels ? (
            <span className="font-mono text-[0.65rem] tabular-nums text-muted">
              {release.vPixels}
            </span>
          ) : null}
        </span>
      ) : null}

      {release.premiumHdr ? (
        <SpecTag
          kind="hdr"
          icon={<Sun className="h-3.5 w-3.5" />}
          note={release.premiumHdr.isDolbyVision ? "Dolby Vision" : undefined}
        >
          {release.premiumHdr.label}
        </SpecTag>
      ) : null}

      {release.premiumAtmos ? (
        <SpecTag
          kind="audio-3d"
          icon={<Waves className="h-3.5 w-3.5" />}
          note="RU · главная дорожка"
        >
          {release.premiumAtmos.label}
        </SpecTag>
      ) : null}
    </div>
  );
}

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

function ReleasePanelContent({ release }: { release: ReleaseDetailView }) {
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
          <p className="font-mono-tech mt-3 inline-flex items-center gap-1.5 text-xs text-accent">
            {release.storageExternal ? "▣" : "■"}
            {release.storageLabel}
          </p>
        ) : null}
        <p className="font-mono-tech mt-2 text-xs text-muted">
          добавлен {release.createdAtLabel} · обновлён {release.updatedAtLabel}
        </p>
      </section>
    </div>
  );
}

function ReleaseActionsMenuItem({
  label,
  icon,
  href,
  onClick,
  disabled,
  danger,
}: {
  label: string;
  icon: ReactNode;
  href?: string;
  onClick?: () => void;
  disabled?: boolean;
  danger?: boolean;
}) {
  const className = `focus-ring font-mono-tech flex w-full items-center gap-2 whitespace-nowrap px-3 py-2 text-left text-[11px] transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
    danger
      ? "text-muted hover:bg-red-500/10 hover:text-red-300"
      : "text-muted hover:bg-accent/10 hover:text-accent"
  }`;

  if (href && !disabled) {
    return (
      <Link href={href} className={className} title={label}>
        {icon}
        {label}
      </Link>
    );
  }

  return (
    <button
      type="button"
      className={className}
      title={label}
      disabled={disabled}
      onClick={onClick}
    >
      {icon}
      {label}
    </button>
  );
}

function ReleasePanelActions({
  movieId,
  movieSlug,
  activeRelease,
  releaseCount,
}: {
  movieId: number;
  movieSlug: string;
  activeRelease: ReleaseDetailView;
  releaseCount: number;
}) {
  const router = useRouter();
  const [confirmKind, setConfirmKind] = useState<null | "probe" | "delete">(
    null,
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRescan = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/movies/${movieId}/releases/${activeRelease.id}/probe`,
        { method: "POST" },
      );
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Не удалось проанализировать файл");
      }
      setConfirmKind(null);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/movies/${movieId}/releases/${activeRelease.id}`,
        { method: "DELETE" },
      );
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Не удалось удалить релиз");
      }
      setConfirmKind(null);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="group/menu relative shrink-0 px-2 py-2 sm:px-3">
        <button
          type="button"
          className="focus-ring font-mono-tech inline-flex items-center justify-center rounded-[var(--radius)] border border-border-strong bg-bg-surface px-2.5 py-1.5 text-muted transition-colors hover:border-accent/40 hover:text-accent group-hover/menu:border-accent/40 group-hover/menu:text-accent group-focus-within/menu:border-accent/40 group-focus-within/menu:text-accent"
          aria-label="Меню действий релиза"
          aria-haspopup="menu"
        >
          <Menu className="h-3.5 w-3.5" aria-hidden />
        </button>

        <div
          className="pointer-events-none invisible absolute right-0 top-full z-30 pt-1 opacity-0 transition-[opacity,visibility] duration-150 group-hover/menu:pointer-events-auto group-hover/menu:visible group-hover/menu:opacity-100 group-focus-within/menu:pointer-events-auto group-focus-within/menu:visible group-focus-within/menu:opacity-100"
          role="menu"
          aria-label="Действия с релизом"
        >
          <div className="min-w-[11.5rem] overflow-hidden rounded-[var(--radius)] border border-border-strong bg-bg-surface py-1 shadow-[0_8px_24px_rgba(0,0,0,0.35)]">
            <ReleaseActionsMenuItem
              label="Редактировать"
              href={`/movies/${movieSlug}/releases/${activeRelease.id}/edit`}
              icon={<Pencil className="h-3.5 w-3.5 shrink-0" aria-hidden />}
            />
            <ReleaseActionsMenuItem
              label="Пересканировать"
              icon={<ScanSearch className="h-3.5 w-3.5 shrink-0" aria-hidden />}
              disabled={!activeRelease.filePath || loading}
              onClick={() => setConfirmKind("probe")}
            />
            <ReleaseActionsMenuItem
              label="Добавить"
              href={`/movies/${movieSlug}/releases/new`}
              icon={<Plus className="h-3.5 w-3.5 shrink-0" aria-hidden />}
            />
            <ReleaseActionsMenuItem
              label="Удалить"
              icon={<Trash2 className="h-3.5 w-3.5 shrink-0" aria-hidden />}
              disabled={releaseCount <= 1 || loading}
              danger
              onClick={() => setConfirmKind("delete")}
            />
          </div>
        </div>
      </div>
      {error ? (
        <p className="px-3 pb-2 text-xs text-red-400" role="alert">
          {error}
        </p>
      ) : null}
      <ConfirmDialog
        open={confirmKind === "probe"}
        onClose={() => setConfirmKind(null)}
        onConfirm={handleRescan}
        loading={loading}
        title="Пересканировать файл?"
        description="Дорожки и длительность будут перезаписаны данными из ffprobe."
        confirmLabel="Пересканировать"
      />
      <ConfirmDialog
        open={confirmKind === "delete"}
        onClose={() => setConfirmKind(null)}
        onConfirm={handleDelete}
        loading={loading}
        title="Удалить релиз?"
        description="Релиз и все его дорожки будут удалены. Файл на диске не затрагивается."
        confirmLabel="Удалить"
      />
    </>
  );
}

export function MovieReleasePanel({
  movieId,
  movieSlug,
  releases,
  initialActiveReleaseId,
}: MovieReleasePanelProps) {
  const pathname = usePathname();
  const [activeId, setActiveId] = useState(initialActiveReleaseId);
  const showTabs = releases.length > 1;

  const activeRelease =
    releases.find((r) => r.id === activeId) ?? releases[0] ?? null;

  const syncUrl = useCallback(
    (id: number) => {
      const params = new URLSearchParams(window.location.search);
      params.set("release", String(id));
      const query = params.toString();
      window.history.replaceState(
        null,
        "",
        query ? `${pathname}?${query}` : pathname,
      );
    },
    [pathname],
  );

  const selectRelease = useCallback(
    (id: number) => {
      setActiveId(id);
      syncUrl(id);
    },
    [syncUrl],
  );

  useEffect(() => {
    const onPopState = () => {
      const params = new URLSearchParams(window.location.search);
      const id = params.get("release");
      if (id) {
        const parsed = Number(id);
        if (releases.some((r) => r.id === parsed)) {
          setActiveId(parsed);
        }
      }
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [releases]);

  if (!activeRelease) {
    return (
      <section className="surface-card mt-8 p-5">
        <p className="text-sm text-muted">У фильма пока нет релизов.</p>
      </section>
    );
  }

  return (
    <section className="surface-card mt-8">
      <div className="flex flex-col gap-0 overflow-visible border-b border-border bg-bg-elevated/50 sm:flex-row sm:items-stretch sm:justify-between">
        {showTabs ? (
          <div
            className="flex flex-wrap gap-0 px-1 pt-1"
            role="tablist"
            aria-label="Релизы"
          >
            {releases.map((release) => {
              const active = release.id === activeId;
              return (
                <button
                  key={release.id}
                  type="button"
                  role="tab"
                  id={`release-tab-${release.id}`}
                  aria-selected={active}
                  aria-controls={`release-panel-${release.id}`}
                  onClick={() => selectRelease(release.id)}
                  className={`focus-ring font-mono-tech rounded-t-[calc(var(--radius)-2px)] border px-4 py-2.5 text-xs transition-colors ${
                    active
                      ? "border-border border-b-transparent bg-bg-surface text-accent shadow-[inset_0_1px_0_var(--accent-glow)]"
                      : "border-transparent bg-transparent text-muted hover:text-text"
                  }`}
                >
                  {release.label}
                </button>
              );
            })}
          </div>
        ) : (
          <div className="px-5 py-3 sm:px-6">
            <p className="font-mono-tech text-faint">
              релиз · {activeRelease.label}
            </p>
          </div>
        )}
        <ReleasePanelActions
          movieId={movieId}
          movieSlug={movieSlug}
          activeRelease={activeRelease}
          releaseCount={releases.length}
        />
      </div>

      <div
        role="tabpanel"
        id={`release-panel-${activeRelease.id}`}
        aria-labelledby={
          showTabs ? `release-tab-${activeRelease.id}` : undefined
        }
        className="p-5 sm:p-6"
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={activeRelease.id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
          >
            <ReleasePanelContent release={activeRelease} />
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  );
}
