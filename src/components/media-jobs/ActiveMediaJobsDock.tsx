"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { Layers3, LoaderCircle, X } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { BuildJobCard } from "@/components/builds/BuildJobCard";
import { ExportJobCard } from "@/components/media-jobs/ExportJobCard";
import { apiFetch } from "@/lib/api/client";
import type { ActiveMediaJobsPayload } from "@/lib/media/active-media-jobs";
import type { SerializedBuild } from "@/lib/builds/build-serialize";

const POLL_IDLE_MS = 5000;
const POLL_OPEN_MS = 2500;

function taskCountLabel(count: number): string {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return `${count} задача`;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) {
    return `${count} задачи`;
  }
  return `${count} задач`;
}

function ActiveJobRow({
  entry,
  allBuilds,
}: {
  entry: ActiveMediaJobsPayload["jobs"][number];
  allBuilds: SerializedBuild[];
}) {
  if (entry.kind === "build") {
    return (
      <BuildJobCard build={entry.job} allItems={allBuilds} compact />
    );
  }
  return <ExportJobCard job={entry.job} compact />;
}

export function ActiveMediaJobsDock() {
  const reduceMotion = useReducedMotion();
  const panelId = useId();
  const fabRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [payload, setPayload] = useState<ActiveMediaJobsPayload | null>(null);

  const refresh = useCallback(async () => {
    try {
      const data = await apiFetch<ActiveMediaJobsPayload>(
        "/api/media-jobs/active",
        undefined,
        "Ошибка загрузки задач",
      );
      setPayload(data);
      if (data.summary.total === 0) {
        setOpen(false);
      }
    } catch {
      // keep last known state
    }
  }, []);

  useEffect(() => {
    void refresh();
    const interval = open ? POLL_OPEN_MS : POLL_IDLE_MS;
    const timer = setInterval(() => void refresh(), interval);
    return () => clearInterval(timer);
  }, [open, refresh]);

  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        fabRef.current?.focus();
      }
    }

    function onPointerDown(event: MouseEvent) {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (fabRef.current?.contains(target)) return;
      const panel = document.getElementById(panelId);
      if (panel?.contains(target)) return;
      setOpen(false);
    }

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("mousedown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("mousedown", onPointerDown);
    };
  }, [open, panelId]);

  const summary = payload?.summary;
  const visible = (summary?.total ?? 0) > 0;
  const hasRunning = (summary?.running ?? 0) > 0;

  if (!visible) return null;

  const panelMotion = reduceMotion
    ? { initial: false, animate: { opacity: 1, y: 0, scale: 1 }, exit: { opacity: 0 } }
    : {
        initial: { opacity: 0, y: 16, scale: 0.96 },
        animate: { opacity: 1, y: 0, scale: 1 },
        exit: { opacity: 0, y: 12, scale: 0.98 },
      };

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[90] flex justify-end px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:px-6">
      <div className="pointer-events-auto relative w-full max-w-[min(100%,26rem)]">
        <AnimatePresence>
          {open ? (
            <motion.div
              key="panel"
              id={panelId}
              role="dialog"
              aria-labelledby={`${panelId}-title`}
              aria-modal="false"
              {...panelMotion}
              transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
              className="mb-3 overflow-hidden rounded-[calc(var(--radius)+0.25rem)] border border-border-strong bg-bg-glass p-1.5 shadow-[0_24px_80px_rgba(0,0,0,0.55),inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-2xl"
            >
              <span
                aria-hidden
                className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-accent/70 to-transparent"
              />

              <div className="surface-card relative max-h-[min(70dvh,34rem)] overflow-hidden rounded-[var(--radius)]">
                <div className="flex items-start justify-between gap-3 border-b border-border/80 px-4 py-3.5">
                  <div className="min-w-0">
                    <p className="font-mono-tech text-[10px] uppercase tracking-[0.16em] text-faint">
                      фоновые задачи
                    </p>
                    <h2
                      id={`${panelId}-title`}
                      className="mt-1 font-display text-lg font-semibold text-text"
                    >
                      {hasRunning ? "Сейчас в работе" : "В очереди"}
                    </h2>
                    <p className="mt-1 text-xs text-muted">
                      {summary?.running
                        ? `${summary.running} выполняется`
                        : null}
                      {summary?.running && summary?.queued ? ", " : null}
                      {summary?.queued ? `${summary.queued} ждёт запуска` : null}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    aria-label="Закрыть список задач"
                    className="focus-ring flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-border-strong bg-bg-deep/50 text-muted transition-colors hover:border-accent/35 hover:text-text"
                  >
                    <X className="h-4 w-4" strokeWidth={1.75} aria-hidden />
                  </button>
                </div>

                <div className="scroll-subtle max-h-[min(58dvh,28rem)] space-y-2 overflow-y-auto overscroll-contain p-3">
                  {payload?.jobs.map((entry) => (
                    <ActiveJobRow
                      key={`${entry.kind}-${entry.job.id}`}
                      entry={entry}
                      allBuilds={payload.builds}
                    />
                  ))}
                </div>

                <div className="border-t border-border/80 px-4 py-3">
                  <Link
                    href="/builds"
                    className="focus-ring inline-flex min-h-11 items-center text-sm font-medium text-accent transition-colors hover:text-accent-bright"
                  >
                    Открыть полную очередь сборок
                  </Link>
                </div>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>

        <div className="flex justify-end">
          <div
            className={`rounded-[var(--radius-pill)] p-1 transition-shadow duration-500 ${
              hasRunning ? "shadow-[0_0_28px_rgba(232,176,90,0.28)]" : ""
            }`}
          >
            <button
              ref={fabRef}
              type="button"
              aria-expanded={open}
              aria-controls={panelId}
              aria-haspopup="dialog"
              aria-label={
                open
                  ? "Скрыть список активных задач"
                  : `Показать активные задачи: ${summary?.total ?? 0}`
              }
              onClick={() => setOpen((value) => !value)}
              className={`focus-ring group relative flex min-h-14 items-center gap-3 rounded-[var(--radius-pill)] border px-4 py-3 backdrop-blur-xl transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] active:scale-[0.98] ${
                open
                  ? "border-accent/45 bg-bg-elevated/85 text-text"
                  : "border-border-strong bg-bg-glass text-text hover:border-accent/35 hover:bg-bg-elevated/70"
              }`}
            >
              <span
                className={`relative flex h-10 w-10 items-center justify-center rounded-full border transition-all duration-300 ${
                  hasRunning
                    ? "border-accent/45 bg-accent/12 text-accent group-hover:shadow-[0_0_22px_rgba(232,176,90,0.45)]"
                    : "border-neural/35 bg-neural/10 text-neural-bright"
                }`}
              >
                {hasRunning ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" strokeWidth={2} aria-hidden />
                ) : (
                  <Layers3 className="h-4 w-4" strokeWidth={1.75} aria-hidden />
                )}
                <span className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full border border-accent/40 bg-bg-deep px-1 text-[10px] font-semibold tabular-nums text-accent">
                  {summary?.total}
                </span>
              </span>

              <span className="pr-1 text-left">
                <span className="block font-mono-tech text-[10px] uppercase tracking-[0.14em] text-faint">
                  {hasRunning ? "в работе" : "в очереди"}
                </span>
                <span className="block text-sm font-medium">
                  {taskCountLabel(summary?.total ?? 0)}
                </span>
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
