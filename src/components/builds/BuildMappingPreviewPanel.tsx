"use client";

import { Route } from "lucide-react";
import { KindBadge } from "@/components/builds/BuildAtoms";
import { MachinedCard, CardSectionHeader } from "@/components/primitives/MachinedCard";
import type { BuildTrackMappingPreviewRow } from "@/lib/builds/build-mapping-preview";
import type { BuildTrackKind } from "@/lib/builds/build-recipe-state";

const ACTION_TONE_CLASS = {
  copy: "border-border-strong bg-bg-deep/40 text-muted",
  transcode: "border-neural/35 bg-neural/[0.08] text-neural-bright",
} as const;

interface BuildMappingPreviewPanelProps {
  rows: BuildTrackMappingPreviewRow[];
}

export function BuildMappingPreviewPanel({ rows }: BuildMappingPreviewPanelProps) {
  if (rows.length === 0) return null;

  return (
    <MachinedCard variant="calm" bodyClassName="space-y-4">
      <CardSectionHeader
        label="сопоставление"
        title="Потоки в исходном файле"
        trailing={
          <span className="font-mono-tech text-[10px] uppercase tracking-[0.14em] text-muted">
            до сборки
          </span>
        }
      />

      <p className="text-xs leading-relaxed text-muted">
        Так worker возьмёт дорожки из MKV — проверьте названия и id до постановки в очередь.
      </p>

      <ul className="space-y-2">
        {rows.map((row, index) => (
          <MappingPreviewRow key={`${row.kind}-${row.trackIndex}-${row.catalogStreamIndex}`} row={row} index={index} />
        ))}
      </ul>
    </MachinedCard>
  );
}

function MappingPreviewRow({
  row,
  index,
}: {
  row: BuildTrackMappingPreviewRow;
  index: number;
}) {
  const kind = row.kind as BuildTrackKind;
  const sourceLine = formatSourceLine(row);
  const targetLine = formatTargetLine(row);

  return (
    <li className="rounded-[var(--radius-sm)] border border-border-strong bg-bg-surface px-3 py-2.5">
      <div className="flex items-start gap-2.5">
        <span className="font-mono-tech w-5 shrink-0 pt-1.5 text-[10px] tabular-nums text-faint">
          #{index + 1}
        </span>
        <KindBadge kind={kind} size="sm" />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-text" title={row.label}>
                {row.label}
              </p>
              <p className="font-mono-tech mt-0.5 text-[10px] tracking-[0.04em] text-faint">
                ключ каталога {row.catalogStreamIndex}
              </p>
            </div>
            <span
              className={`font-mono-tech shrink-0 rounded-full border px-2 py-0.5 text-[9px] uppercase tracking-[0.1em] ${ACTION_TONE_CLASS[row.action]}`}
            >
              {row.actionLabel}
            </span>
          </div>

          {sourceLine ? (
            <p className="mt-2 flex items-start gap-1.5 text-xs text-text">
              <Route className="mt-0.5 h-3.5 w-3.5 shrink-0 text-cyan" strokeWidth={1.5} aria-hidden />
              <span className="min-w-0 break-words">{sourceLine}</span>
            </p>
          ) : null}

          {targetLine ? (
            <p className="mt-1 font-mono-tech text-[10px] tracking-[0.04em] text-muted">
              {targetLine}
            </p>
          ) : null}
        </div>
      </div>
    </li>
  );
}

function formatSourceLine(row: BuildTrackMappingPreviewRow): string | null {
  if (!row.resolvedTitle && row.ffprobeGlobalIndex == null) return null;

  const parts: string[] = [];
  if (row.resolvedTitle) parts.push(`«${row.resolvedTitle}»`);
  if (row.resolvedCodec) parts.push(row.resolvedCodec.toUpperCase());
  if (row.ffprobeGlobalIndex != null) parts.push(`ffprobe ${row.ffprobeGlobalIndex}`);
  if (row.mkvTrackId != null) parts.push(`mkv id ${row.mkvTrackId}`);

  return parts.length > 0 ? parts.join(" · ") : null;
}

function formatTargetLine(row: BuildTrackMappingPreviewRow): string | null {
  if (row.action === "transcode" && row.ffmpegMap) {
    return `ffmpeg ${row.ffmpegMap}`;
  }
  if (row.action === "copy" && row.mkvTrackId != null) {
    return `mkvmerge: поток ${row.mkvTrackId} без перекодирования`;
  }
  return null;
}
