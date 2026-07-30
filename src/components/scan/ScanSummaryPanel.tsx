"use client";

import { Fragment, useState } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import {
  AlertTriangle,
  ArrowRight,
  Check,
  FolderInput,
  Plus,
  RefreshCw,
} from "lucide-react";
import type {
  ScanCreatedEntry,
  ScanChangeFlag,
  ScanErrorEntry,
  ScanMovedEntry,
  ScanSummary,
  ScanUpdatedEntry,
} from "@/lib/media/scanner";
import { MachinedCard } from "@/components/primitives/MachinedCard";
import { SpecTag } from "@/components/shared/SpecTag";
import { dictLabel, RELEASE_TYPES } from "@/lib/shared/dictionaries";
import { displayFilePath } from "@/lib/shared/display-path";
import { pluralRu } from "@/lib/shared/russian-plural";

interface ScanSummaryPanelProps {
  summary: ScanSummary;
  cancelled: boolean;
}

const COLLAPSE_THRESHOLD = 5;

type TileTone = "accent" | "neural" | "cyan" | "muted" | "danger";

interface StatTile {
  key: string;
  count: number;
  label: string;
  tone: TileTone;
  icon: typeof Plus;
}

const TONE_STYLES: Record<
  TileTone,
  { pill: string; glow: string; value: string }
> = {
  accent: {
    pill: "border-accent/35 bg-accent/[0.10] text-accent-bright",
    glow: "glow-accent-12",
    value: "text-accent-bright",
  },
  neural: {
    pill: "border-neural/35 bg-neural/[0.10] text-neural",
    glow: "glow-neural-12",
    value: "text-neural",
  },
  cyan: {
    pill: "border-cyan/35 bg-cyan/[0.10] text-cyan",
    glow: "glow-cyan-12",
    value: "text-cyan",
  },
  muted: {
    pill: "border-border bg-bg-elevated/70 text-muted",
    glow: "",
    value: "text-text",
  },
  danger: {
    pill: "border-danger/35 bg-danger/[0.10] text-danger",
    glow: "",
    value: "text-danger",
  },
};

export function ScanSummaryPanel({ summary, cancelled }: ScanSummaryPanelProps) {
  const reduce = useReducedMotion();
  const tiles: StatTile[] = [
    {
      key: "created",
      count: summary.newDrafts,
      label: pluralRu(summary.newDrafts, "новый", "новых", "новых"),
      tone: "accent",
      icon: Plus,
    },
    {
      key: "updated",
      count: summary.updated,
      label: pluralRu(summary.updated, "обновлённый", "обновлённых", "обновлённых"),
      tone: "neural",
      icon: RefreshCw,
    },
    {
      key: "moved",
      count: summary.moved,
      label: pluralRu(summary.moved, "перемещённый", "перемещённых", "перемещённых"),
      tone: "cyan",
      icon: FolderInput,
    },
    {
      key: "skipped",
      count: summary.skipped,
      label: pluralRu(summary.skipped, "пропущенный", "пропущенных", "пропущенных"),
      tone: "muted",
      icon: Check,
    },
  ];
  if (summary.errors.length > 0) {
    tiles.push({
      key: "errors",
      count: summary.errors.length,
      label: pluralRu(summary.errors.length, "ошибка", "ошибки", "ошибок"),
      tone: "danger",
      icon: AlertTriangle,
    });
  }

  const nothingChanged =
    summary.newDrafts === 0 &&
    summary.updated === 0 &&
    summary.moved === 0 &&
    summary.errors.length === 0;

  const enter = reduce
    ? { hidden: {}, show: {} }
    : {
        hidden: { opacity: 0, y: 12 },
        show: { opacity: 1, y: 0 },
      };

  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={{
        hidden: {},
        show: { transition: { staggerChildren: 0.05 } },
      }}
    >
      <MachinedCard variant="calm" bodyClassName="space-y-5">
        <motion.div variants={enter} className="flex flex-wrap items-center gap-3">
          <span
            className={`inline-flex h-2.5 w-2.5 shrink-0 rounded-full ${
              cancelled
                ? "bg-ember-bright shadow-[0_0_10px_rgba(200,112,56,0.7)]"
                : nothingChanged
                  ? "bg-muted/60"
                  : "bg-accent shadow-[0_0_10px_var(--accent-glow)]"
            }`}
            aria-hidden
          />
          <div className="min-w-0">
            <h2 className="font-display text-xl font-semibold tracking-tight">
              {cancelled ? "Сканирование остановлено" : "Сканирование завершено"}
            </h2>
            <p className="mt-0.5 font-mono-tech text-xs text-muted">
              {summary.found}{" "}
              {pluralRu(summary.found, "файл", "файла", "файлов")} проверено
              {cancelled ? ", проход прерван" : ""}
            </p>
          </div>
        </motion.div>

        <motion.div
          variants={enter}
          className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5"
        >
          {tiles.map((tile) => {
            const tone = TONE_STYLES[tile.tone];
            const Icon = tile.icon;
            const active = tile.count > 0;
            return (
              <div
                key={tile.key}
                className={`relative flex items-center gap-3 rounded-[var(--radius-sm)] border border-border bg-bg-elevated/50 px-3 py-2.5 ${
                  active && tone.glow ? tone.glow : ""
                }`}
              >
                <span
                  className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-sm)] border ${tone.pill}`}
                  aria-hidden
                >
                  <Icon className="h-4 w-4" strokeWidth={1.5} />
                </span>
                <div className="min-w-0">
                  <p
                    className={`font-mono text-2xl font-semibold tabular-nums leading-none ${tone.value}`}
                  >
                    {tile.count}
                  </p>
                  <p className="mt-1 font-mono-tech text-[10px] uppercase tracking-[0.14em] text-muted">
                    {tile.label}
                  </p>
                </div>
              </div>
            );
          })}
        </motion.div>

        {nothingChanged ? (
          <motion.div variants={enter}>
            <EmptyResult />
          </motion.div>
        ) : (
          <div className="space-y-4">
            {summary.created.length > 0 ? (
              <DetailSection
                title="Новые фильмы"
                count={summary.created.length}
                tone="accent"
              >
                {summary.created.map((entry) => (
                  <CreatedRow key={`c-${entry.movieId}-${entry.filePath}`} entry={entry} />
                ))}
              </DetailSection>
            ) : null}

            {summary.updatedFiles.length > 0 ? (
              <DetailSection
                title="Обновлённые релизы"
                count={summary.updatedFiles.length}
                tone="neural"
              >
                {summary.updatedFiles.map((entry) => (
                  <UpdatedRow key={`u-${entry.movieId}-${entry.filePath}`} entry={entry} />
                ))}
              </DetailSection>
            ) : null}

            {summary.movedFiles.length > 0 ? (
              <DetailSection
                title="Перемещённые файлы"
                count={summary.movedFiles.length}
                tone="cyan"
              >
                {summary.movedFiles.map((entry) => (
                  <MovedRow key={`m-${entry.movieId}-${entry.toPath}`} entry={entry} />
                ))}
              </DetailSection>
            ) : null}

            {summary.errors.length > 0 ? (
              <DetailSection
                title="Ошибки"
                count={summary.errors.length}
                tone="danger"
              >
                {summary.errors.map((entry, i) => (
                  <ErrorRow key={`e-${i}-${entry.filePath}`} entry={entry} />
                ))}
              </DetailSection>
            ) : null}
          </div>
        )}
      </MachinedCard>
    </motion.div>
  );
}

function EmptyResult() {
  return (
    <div className="flex items-center gap-3 rounded-[var(--radius-sm)] border border-border bg-bg-deep/40 px-4 py-4">
      <span
        className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-accent/30 bg-accent/[0.08] text-accent"
        aria-hidden
      >
        <Check className="h-5 w-5" strokeWidth={1.5} />
      </span>
      <div className="min-w-0">
        <p className="text-sm font-medium text-text">Каталог актуален</p>
        <p className="mt-0.5 text-xs text-muted">
          Новых, изменённых или перемещённых файлов не найдено.
        </p>
      </div>
    </div>
  );
}

interface DetailSectionProps {
  title: string;
  count: number;
  tone: TileTone;
  children: React.ReactNode;
}

function DetailSection({ title, count, tone, children }: DetailSectionProps) {
  const [expanded, setExpanded] = useState(false);
  const reduce = useReducedMotion();
  const overThreshold = count > COLLAPSE_THRESHOLD;
  const visibleCount = overThreshold && !expanded ? COLLAPSE_THRESHOLD : count;
  const items = Array.isArray(children) ? children : [children];
  const dotClass =
    tone === "accent"
      ? "bg-accent"
      : tone === "neural"
        ? "bg-neural"
        : tone === "cyan"
          ? "bg-cyan"
          : "bg-danger";

  return (
    <motion.section
      initial={reduce ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="space-y-2"
    >
      <div className="flex items-center gap-2">
        <span
          className={`inline-block h-1.5 w-1.5 rounded-full ${dotClass}`}
          aria-hidden
        />
        <h3 className="font-mono-tech text-[11px] uppercase tracking-[0.18em] text-muted">
          {title}
        </h3>
        <span className="font-mono text-xs tabular-nums text-faint">{count}</span>
      </div>

      <div className="divide-y divide-border/60 overflow-hidden rounded-[var(--radius-sm)] border border-border bg-bg-deep/30">
        {items.slice(0, visibleCount).map((item, i) => (
          <Fragment key={i}>{item}</Fragment>
        ))}
      </div>

      {overThreshold ? (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="focus-ring font-mono-tech rounded-[var(--radius-sm)] px-2 py-1 text-[11px] uppercase tracking-[0.14em] text-muted transition-colors hover:text-accent"
        >
          {expanded
            ? "свернуть"
            : `показать все ${count}`}
        </button>
      ) : null}
    </motion.section>
  );
}

function CreatedRow({ entry }: { entry: ScanCreatedEntry }) {
  const releaseLabel = dictLabel(RELEASE_TYPES, entry.releaseType);
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 px-3 py-2.5">
      <div className="min-w-0 flex-1">
        <Link
          href={`/movies/${entry.slug}`}
          className="focus-ring rounded-sm font-display text-sm font-medium text-text transition-colors hover:text-accent"
        >
          {entry.title}
          {entry.year ? (
            <span className="ml-1.5 font-mono-tech text-xs text-muted">
              {entry.year}
            </span>
          ) : null}
        </Link>
        <p
          className="mt-0.5 truncate font-mono text-[11px] text-faint"
          title={displayFilePath(entry.filePath)}
        >
          {displayFilePath(entry.filePath)}
        </p>
      </div>
      {releaseLabel ? (
        <SpecTag variant="chip" size="sm" kind="release">
          {releaseLabel}
        </SpecTag>
      ) : null}
    </div>
  );
}

const CHANGE_META: Record<
  ScanChangeFlag,
  { label: string; className: string }
> = {
  size: {
    label: "размер",
    className: "border-neural/40 bg-neural/[0.10] text-neural",
  },
  content: {
    label: "содержимое",
    className: "border-neural/50 bg-neural/[0.14] text-neural",
  },
  duration: {
    label: "длительность",
    className: "border-neural/40 bg-neural/[0.10] text-neural",
  },
  cover: {
    label: "обложка",
    className: "border-accent/40 bg-accent/[0.10] text-accent-bright",
  },
  storage: {
    label: "хранилище",
    className: "border-cyan/40 bg-cyan/[0.10] text-cyan",
  },
  touched: {
    label: "файл изменён",
    className: "border-border bg-bg-elevated/70 text-muted",
  },
  added: {
    label: "новый эпизод",
    className: "border-accent/40 bg-accent/[0.10] text-accent-bright",
  },
};

function ChangeChips({ changes }: { changes: ScanChangeFlag[] }) {
  if (changes.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {changes.map((flag) => {
        const meta = CHANGE_META[flag];
        return (
          <span
            key={flag}
            className={`font-mono-tech inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-[0.12em] ${meta.className}`}
          >
            {meta.label}
          </span>
        );
      })}
    </div>
  );
}

function UpdatedRow({ entry }: { entry: ScanUpdatedEntry }) {
  const releaseLabel = dictLabel(RELEASE_TYPES, entry.releaseType);
  return (
    <div className="flex flex-wrap items-start gap-x-3 gap-y-1.5 px-3 py-2.5">
      <div className="min-w-0 flex-1">
        <Link
          href={`/movies/${entry.slug}`}
          className="focus-ring rounded-sm font-display text-sm font-medium text-text transition-colors hover:text-accent"
        >
          {entry.title}
          {entry.year ? (
            <span className="ml-1.5 font-mono-tech text-xs text-muted">
              {entry.year}
            </span>
          ) : null}
        </Link>
        <p
          className="mt-0.5 truncate font-mono text-[11px] text-faint"
          title={displayFilePath(entry.filePath)}
        >
          {displayFilePath(entry.filePath)}
        </p>
        {entry.changes.length > 0 ? (
          <div className="mt-1.5">
            <ChangeChips changes={entry.changes} />
          </div>
        ) : null}
      </div>
      {releaseLabel ? (
        <SpecTag variant="chip" size="sm" kind="release">
          {releaseLabel}
        </SpecTag>
      ) : null}
    </div>
  );
}

function MovedRow({ entry }: { entry: ScanMovedEntry }) {
  const releaseLabel = dictLabel(RELEASE_TYPES, entry.releaseType);
  return (
    <div className="px-3 py-2.5">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <Link
          href={`/movies/${entry.slug}`}
          className="focus-ring rounded-sm font-display text-sm font-medium text-text transition-colors hover:text-accent"
        >
          {entry.title}
          {entry.year ? (
            <span className="ml-1.5 font-mono-tech text-xs text-muted">
              {entry.year}
            </span>
          ) : null}
        </Link>
        {releaseLabel ? (
          <SpecTag variant="chip" size="sm" kind="release">
            {releaseLabel}
          </SpecTag>
        ) : null}
      </div>
      <div className="mt-1.5 flex min-w-0 items-center gap-2 font-mono text-[11px] text-faint">
        <span
          className="min-w-0 flex-1 truncate"
          title={displayFilePath(entry.fromPath)}
        >
          {displayFilePath(entry.fromPath)}
        </span>
        <ArrowRight className="h-3 w-3 shrink-0 text-cyan" aria-hidden />
        <span
          className="min-w-0 flex-1 truncate text-muted"
          title={displayFilePath(entry.toPath)}
        >
          {displayFilePath(entry.toPath)}
        </span>
      </div>
    </div>
  );
}

const STAGE_LABEL: Record<ScanErrorEntry["stage"], string> = {
  ffprobe: "ffprobe",
  io: "файл",
  unknown: "прочее",
};

function ErrorRow({ entry }: { entry: ScanErrorEntry }) {
  return (
    <div className="space-y-1 px-3 py-2.5">
      <div className="flex items-center gap-2">
        <span
          className="truncate font-mono text-xs font-medium text-danger"
          title={entry.fileName}
        >
          {entry.fileName}
        </span>
        <span className="font-mono-tech shrink-0 rounded-full border border-danger/30 bg-danger/[0.08] px-1.5 py-0.5 text-[9px] uppercase tracking-[0.14em] text-danger">
          {STAGE_LABEL[entry.stage]}
        </span>
      </div>
      <p className="text-xs leading-relaxed text-muted">{entry.message}</p>
      <p
        className="truncate font-mono text-[10px] text-faint"
        title={displayFilePath(entry.filePath)}
      >
        {displayFilePath(entry.filePath)}
      </p>
    </div>
  );
}
