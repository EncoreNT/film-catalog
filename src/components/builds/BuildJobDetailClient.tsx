"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  Clapperboard,
  ExternalLink,
  FileOutput,
  FolderOpen,
  HardDrive,
  LoaderCircle,
  RefreshCw,
} from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { Button } from "@/components/primitives/Button";
import { ConfirmDialog } from "@/components/primitives/ConfirmDialog";
import { ApiCoverImage } from "@/components/primitives/ApiCoverImage";
import { DetailMetaLine } from "@/components/primitives/DetailMetaLine";
import { MachinedCard, CardSectionHeader } from "@/components/primitives/MachinedCard";
import { LaserCardFrame } from "@/components/primitives/LaserCardFrame";
import { BuildJobDetailTrackRow } from "@/components/builds/BuildJobDetailTrackRow";
import { BuildWarningsPanel } from "@/components/builds/BuildWarningsPanel";
import { SectionLabel } from "@/components/builds/BuildAtoms";
import { SpotlightTier } from "@/components/layout/SpotlightTier";
import { SpotlightTarget } from "@/components/layout/SpotlightTarget";
import { TierCoverOverlay } from "@/components/shared/TierCoverOverlay";
import { apiFetch } from "@/lib/api/client";
import { movieCoverUrlFromMovie } from "@/lib/covers/cover-url";
import type { SerializedBuild } from "@/lib/builds/build-serialize";
import { buildLaserTier } from "@/lib/builds/build-visual-tier";
import {
  BUILD_STATUS_META,
  buildTimeCaption,
} from "@/lib/builds/build-queue-display";
import {
  buildOutputMeta,
  buildPhaseLabel,
  buildSourceRoleLabel,
  buildTimelineEntries,
  BUILD_TRACK_KIND_SECTION,
  groupBuildTracksByKind,
} from "@/lib/builds/build-detail-display";
import { catalogTierRibbon } from "@/lib/media/spec-tags";
import {
  tierChipTone,
  tierPosterGlow,
} from "@/lib/media/tier-presentation";
import { formatDuration } from "@/lib/shared/format";
import { dictLabel, RELEASE_TYPES } from "@/lib/shared/dictionaries";

const TERMINAL = new Set(["SUCCEEDED", "FAILED", "CANCELLED"]);

const TIER_CHIP: Record<ReturnType<typeof tierChipTone>, string> = {
  default: "border-border-strong text-text/85",
  gold: "border-accent/45 text-accent-bright",
  ruby: "border-crimson/45 text-crimson-bright",
};

function heroShellClass(
  build: SerializedBuild,
  cancelPending: boolean,
): string {
  if (build.status === "RUNNING" && !cancelPending) {
    return "border-accent/35 bg-bg-elevated/40";
  }
  if (cancelPending) {
    return "border-ember/35 bg-bg-elevated/35";
  }
  if (build.visualTier === "ruby") {
    return "border-crimson/35 bg-bg-elevated/40";
  }
  if (build.visualTier === "gold") {
    return "border-accent/35 bg-bg-elevated/40";
  }
  return "border-border bg-bg-elevated/25";
}

function ProgressPanel({ build }: { build: SerializedBuild }) {
  const isRunning = build.status === "RUNNING";
  const isQueued = build.status === "QUEUED";
  const progress =
    build.progressPercent != null ? Math.round(build.progressPercent) : null;
  const phaseLabel = buildPhaseLabel(build.phase);

  if (!isRunning && !isQueued && progress == null && !build.progressMessage) {
    return null;
  }

  return (
    <div
      className={`space-y-3 rounded-[var(--radius-sm)] border px-4 py-4 ${
        isRunning
          ? "border-accent/35 bg-accent/[0.06]"
          : "border-border/80 bg-bg-deep/35"
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="space-y-0.5">
          {phaseLabel ? (
            <p className="text-sm font-medium text-text">{phaseLabel}</p>
          ) : isQueued ? (
            <p className="text-sm font-medium text-text">Ожидает worker</p>
          ) : null}
          {build.cancelRequested ? (
            <p className="text-xs text-ember-bright">
              Worker завершит текущий шаг и остановит сборку
            </p>
          ) : build.progressMessage ? (
            <p className="text-xs text-muted">{build.progressMessage}</p>
          ) : null}
        </div>
        {progress != null ? (
          <p className="font-display text-2xl font-semibold tabular-nums text-accent">
            {progress}%
          </p>
        ) : null}
      </div>

      {progress != null ? (
        <div
          className="h-2 overflow-hidden rounded-full bg-bg-elevated/80"
          role="progressbar"
          aria-valuenow={progress}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Прогресс сборки"
        >
          <motion.div
            className={`h-full rounded-full ${isRunning ? "bg-accent" : "bg-neural-bright/70"}`}
            initial={false}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
          />
        </div>
      ) : isQueued ? (
        <div className="h-2 overflow-hidden rounded-full bg-bg-elevated/80">
          <div className="h-full w-1/3 animate-pulse rounded-full bg-neural-bright/40" />
        </div>
      ) : null}
    </div>
  );
}

export function BuildJobDetailClient({
  initialBuild,
}: {
  initialBuild: SerializedBuild;
}) {
  const reduceMotion = useReducedMotion();
  const [build, setBuild] = useState(initialBuild);
  const [loading, setLoading] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [polling, setPolling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const meta = BUILD_STATUS_META[build.status];
  const coverUrl = movieCoverUrlFromMovie(build.movie);
  const outputMeta = useMemo(() => buildOutputMeta(build), [build]);
  const timeline = useMemo(() => buildTimelineEntries(build), [build]);
  const trackGroups = useMemo(() => groupBuildTracksByKind(build.tracks), [build.tracks]);
  const timeCaption = buildTimeCaption(build);
  const isActive = build.status === "RUNNING" || build.status === "QUEUED";
  const cancelPending = build.cancelRequested && isActive;
  const laserTier = buildLaserTier(build.visualTier);
  const tierRibbon = catalogTierRibbon(laserTier);
  const chipTone = tierChipTone(laserTier);
  const statusMeta =
    cancelPending && build.status === "RUNNING"
      ? {
          label: "Отменяется",
          badgeClass:
            "border-ember/40 bg-ember/[0.1] text-ember-bright ring-1 ring-inset ring-ember/25",
          dotClass: "bg-ember-bright/90",
        }
      : meta;

  const refresh = useCallback(async () => {
    const next = await apiFetch<SerializedBuild>(
      `/api/builds/${build.id}`,
      undefined,
      "Не удалось загрузить сборку",
    );
    setBuild(next);
  }, [build.id]);

  useEffect(() => {
    if (TERMINAL.has(build.status)) return;
    const timer = setInterval(() => {
      setPolling(true);
      void refresh()
        .catch(() => undefined)
        .finally(() => setPolling(false));
    }, 3000);
    return () => clearInterval(timer);
  }, [build.status, refresh]);

  const handleCancel = async () => {
    setLoading(true);
    setError(null);
    try {
      const next = await apiFetch<SerializedBuild>(
        `/api/builds/${build.id}/cancel`,
        { method: "POST" },
        "Не удалось отменить",
      );
      setBuild(next);
      setConfirmCancel(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = async () => {
    setLoading(true);
    setError(null);
    try {
      const next = await apiFetch<SerializedBuild>(
        `/api/builds/${build.id}/retry`,
        { method: "POST" },
        "Не удалось повторить",
      );
      setBuild(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <SpotlightTier tier={build.spotlightTier} />

      <motion.section
        initial={reduceMotion ? false : { opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className={`relative overflow-hidden rounded-[var(--radius)] border p-4 sm:p-6 ${heroShellClass(build, cancelPending)}`}
      >
        {build.status === "RUNNING" && !cancelPending ? (
          <span
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent/50 to-transparent"
          />
        ) : build.visualTier === "ruby" ? (
          <span
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-crimson/50 to-transparent"
          />
        ) : build.visualTier === "gold" ? (
          <span
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent/45 to-transparent"
          />
        ) : null}

        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:gap-6">
          <SpotlightTarget side="left">
            <LaserCardFrame tier={laserTier} className="mx-auto w-fit sm:mx-0">
              <div
                className={`relative h-[120px] w-20 shrink-0 overflow-hidden rounded-[var(--radius-sm)] border border-border-strong bg-bg-deep/80 sm:h-[144px] sm:w-24 ${tierPosterGlow(laserTier, "inset")}`}
              >
                {coverUrl ? (
                  <ApiCoverImage
                    src={coverUrl}
                    alt=""
                    width={96}
                    height={144}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-faint">
                    <Clapperboard className="h-8 w-8" strokeWidth={1.5} aria-hidden />
                  </div>
                )}

                <TierCoverOverlay tier={laserTier} />

                {tierRibbon ? (
                  <span
                    className={`absolute left-1.5 top-1.5 z-10 max-w-[calc(100%-0.75rem)] rounded-full border bg-bg-deep/90 px-2 py-0.5 font-mono-tech text-[0.55rem] uppercase tracking-[0.1em] ${TIER_CHIP[chipTone]}`}
                  >
                    {tierRibbon}
                  </span>
                ) : null}

                <span
                  aria-hidden
                  className={`absolute bottom-1.5 left-1.5 z-10 h-1.5 w-1.5 rounded-full ${statusMeta.dotClass}`}
                />
              </div>
            </LaserCardFrame>
          </SpotlightTarget>

          <div className="min-w-0 flex-1 space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 space-y-1">
                <p className="font-mono-tech text-[10px] uppercase tracking-[0.14em] text-faint">
                  Сборка #{build.id}
                  {timeCaption ? <span className="text-muted"> · {timeCaption}</span> : null}
                </p>
                <h1 className="font-display text-2xl font-bold leading-tight tracking-tight sm:text-3xl">
                  <Link
                    href={`/movies/${build.movie.slug}`}
                    className="focus-ring text-text transition-colors hover:text-accent"
                  >
                    {build.movie.title}
                  </Link>
                </h1>
                <p className="truncate text-sm text-muted">{outputMeta.basename}</p>
                <DetailMetaLine
                  className="pt-0.5 text-[11px] sm:text-xs"
                  separator="pipe"
                  items={timeline.map((entry) => ({
                    key: entry.key,
                    node: (
                      <span title={entry.hint}>
                        <span className="text-faint">{entry.label.toLowerCase()}</span>{" "}
                        <span className="tabular-nums text-text/90">{entry.value}</span>
                      </span>
                    ),
                  }))}
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {polling && isActive ? (
                  <span className="font-mono-tech inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.12em] text-faint">
                    <RefreshCw className="h-3 w-3 animate-spin" aria-hidden />
                    обновление
                  </span>
                ) : null}
                <span
                  className={`font-mono-tech inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-[0.12em] ${statusMeta.badgeClass}`}
                >
                  {build.status === "RUNNING" && !cancelPending ? (
                    <LoaderCircle className="h-3 w-3 animate-spin" strokeWidth={2} aria-hidden />
                  ) : (
                    <span className={`h-1.5 w-1.5 rounded-full ${statusMeta.dotClass}`} aria-hidden />
                  )}
                  {statusMeta.label}
                </span>
              </div>
            </div>

            <ProgressPanel build={build} />

            {build.status === "FAILED" && build.errorMessage ? (
              <div
                role="alert"
                className="flex items-start gap-2.5 rounded-[var(--radius-sm)] border border-danger/35 bg-danger/[0.08] px-3 py-3"
              >
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-danger" aria-hidden />
                <div className="min-w-0 space-y-1">
                  <p className="text-sm font-medium text-danger">Сборка завершилась с ошибкой</p>
                  <p className="break-words text-sm text-text/90">{build.errorMessage}</p>
                </div>
              </div>
            ) : null}

            <div className="flex flex-wrap gap-2">
              <Link
                href={`/movies/${build.movie.slug}`}
                className="focus-ring inline-flex min-h-10 items-center gap-2 rounded-[var(--radius)] border border-border-strong px-4 text-sm text-text transition-colors hover:border-border-strong hover:bg-bg-deep/40"
              >
                <ExternalLink className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden />
                К фильму
              </Link>
              {build.outputReleaseId ? (
                <Link
                  href={`/movies/${build.movie.slug}?release=${build.outputReleaseId}`}
                  className="focus-ring inline-flex min-h-10 items-center gap-2 rounded-[var(--radius)] border border-accent/40 px-4 text-sm text-accent transition-colors hover:border-accent/60 hover:bg-accent/[0.08]"
                >
                  <FolderOpen className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden />
                  Открыть релиз
                </Link>
              ) : null}
              {isActive && !cancelPending ? (
                <Button
                  type="button"
                  variant="danger"
                  onClick={() => setConfirmCancel(true)}
                >
                  Отменить
                </Button>
              ) : null}
              {cancelPending ? (
                <p className="self-center text-sm text-muted">
                  Отмена уже запрошена. Worker завершит текущий шаг и остановит сборку.
                </p>
              ) : null}
              {build.status === "FAILED" || build.status === "CANCELLED" ? (
                <Button
                  type="button"
                  variant="secondary"
                  loading={loading}
                  onClick={() => void handleRetry()}
                >
                  Повторить
                </Button>
              ) : null}
            </div>
            {error ? <p className="text-sm text-danger">{error}</p> : null}
          </div>
        </div>
      </motion.section>

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="space-y-6 lg:col-span-2">
          <MachinedCard variant="calm" bodyClassName="space-y-4">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-sm)] border border-accent/35 bg-accent/[0.08] text-accent">
                <FileOutput className="h-4 w-4" strokeWidth={1.5} aria-hidden />
              </span>
              <CardSectionHeader label="результат" title="Выходной файл" />
            </div>

            <dl className="space-y-3 text-sm">
              <div>
                <dt className="font-mono-tech text-[10px] uppercase tracking-[0.14em] text-faint">
                  Имя файла
                </dt>
                <dd className="mt-1 font-medium text-text">{outputMeta.basename}</dd>
              </div>
              <div>
                <dt className="font-mono-tech text-[10px] uppercase tracking-[0.14em] text-faint">
                  Полный путь
                </dt>
                <dd className="mt-1 break-all font-mono-tech text-xs text-muted">
                  {build.outputPath}
                </dd>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <dt className="font-mono-tech text-[10px] uppercase tracking-[0.14em] text-faint">
                    Тип релиза
                  </dt>
                  <dd className="mt-1 text-text">
                    {outputMeta.releaseType ?? "Не указан"}
                  </dd>
                </div>
                <div>
                  <dt className="font-mono-tech text-[10px] uppercase tracking-[0.14em] text-faint">
                    Версия
                  </dt>
                  <dd className="mt-1 text-text">{outputMeta.version ?? "Театральная"}</dd>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <HardDrive className="mt-0.5 h-4 w-4 shrink-0 text-muted" strokeWidth={1.5} aria-hidden />
                <div>
                  <dt className="font-mono-tech text-[10px] uppercase tracking-[0.14em] text-faint">
                    Хранилище
                  </dt>
                  <dd className="mt-1 text-text">{outputMeta.storage}</dd>
                </div>
              </div>
            </dl>
          </MachinedCard>

          {build.sources.length > 0 ? (
            <MachinedCard variant="calm" bodyClassName="space-y-4">
              <CardSectionHeader
                label="источники"
                title={`Файлы (${build.sources.length})`}
              />
              <ul className="space-y-3">
                {build.sources.map((source) => {
                  const releaseLabel = source.release?.releaseType
                    ? dictLabel(RELEASE_TYPES, source.release.releaseType)
                    : null;
                  const duration = formatDuration(source.durationSeconds, "long");

                  return (
                    <li
                      key={source.id}
                      className="rounded-[var(--radius-sm)] border border-border/80 bg-bg-deep/35 px-3 py-3"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <SectionLabel>{buildSourceRoleLabel(source.role)}</SectionLabel>
                        {releaseLabel ? (
                          <span className="font-mono-tech text-[10px] uppercase tracking-[0.12em] text-accent/85">
                            {releaseLabel}
                          </span>
                        ) : null}
                      </div>
                      <p
                        className="mt-2 break-all font-mono-tech text-[11px] text-muted"
                        title={source.filePath}
                      >
                        {source.filePath}
                      </p>
                      {duration ? (
                        <p className="mt-1 text-xs text-faint">Длительность {duration}</p>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            </MachinedCard>
          ) : null}
        </div>

        <div className="space-y-6 lg:col-span-3">
          <MachinedCard variant="calm" bodyClassName="space-y-5">
            <CardSectionHeader
              label="состав"
              title={`Состав MKV · ${build.tracks.length} ${
                build.tracks.length === 1
                  ? "дорожка"
                  : build.tracks.length < 5
                    ? "дорожки"
                    : "дорожек"
              }`}
            />

            {trackGroups.length === 0 ? (
              <p className="text-sm text-muted">Дорожки не заданы.</p>
            ) : (
              trackGroups.map((group) => {
                const section = BUILD_TRACK_KIND_SECTION[group.kind];
                return (
                  <div key={group.kind} className="space-y-2.5">
                    <div>
                      <p className="text-sm font-medium text-text">{section.title}</p>
                      {section.hint ? (
                        <p className="text-xs text-muted">{section.hint}</p>
                      ) : null}
                    </div>
                    <div className="space-y-2">
                      {group.items.map((track) => (
                        <BuildJobDetailTrackRow
                          key={track.id}
                          track={track}
                          index={track.sortOrder}
                        />
                      ))}
                    </div>
                  </div>
                );
              })
            )}
          </MachinedCard>

          <BuildWarningsPanel
            readOnly
            validation={{
              ok: true,
              warnings: build.warnings as { code: string; message: string; severity: string }[],
            }}
            ackWarnings
            onAckChange={() => undefined}
          />
        </div>
      </div>

      <ConfirmDialog
        open={confirmCancel}
        onClose={() => setConfirmCancel(false)}
        onConfirm={() => void handleCancel()}
        loading={loading}
        title="Отменить сборку?"
        description={
          <>
            Worker завершит текущий шаг и остановит задачу. Уже выполненная работа
            не сохранится, сборку придётся запускать заново.
            {build.phase ? (
              <>
                {" "}
                Сейчас: {buildPhaseLabel(build.phase) ?? build.phase} (
                {build.progressPercent != null
                  ? Math.round(build.progressPercent)
                  : 0}
                %).
              </>
            ) : null}
          </>
        }
        confirmLabel="Отменить сборку"
      />
    </div>
  );
}
