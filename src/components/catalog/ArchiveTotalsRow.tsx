import type { ReactNode } from "react";
import { Clock, HardDrive } from "lucide-react";

interface ArchiveTotalStatProps {
  icon: ReactNode;
  value: string;
  label: string;
  caption?: string;
}

function ArchiveTotalStat({
  icon,
  value,
  label,
  caption,
}: ArchiveTotalStatProps) {
  return (
    <div className="relative flex min-h-[4.5rem] items-center gap-3 overflow-hidden rounded-[var(--radius)] border border-border bg-bg-surface p-3">
      <span
        className="pointer-events-none absolute inset-0 opacity-60"
        aria-hidden
        style={{
          background:
            "radial-gradient(ellipse 80% 120% at 0% 0%, var(--accent-soft) 0%, transparent 70%)",
        }}
      />
      <span
        className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent/15 text-accent"
        aria-hidden
      >
        {icon}
      </span>
      <span className="relative flex min-w-0 flex-1 flex-col">
        <span className="font-display text-2xl font-bold tabular-nums leading-none text-text">
          {value}
        </span>
        <span className="font-display mt-0.5 text-sm font-semibold leading-tight text-text">
          {label}
        </span>
        {caption ? (
          <span className="font-mono-tech mt-0.5 truncate text-[0.6rem] text-muted">
            {caption}
          </span>
        ) : null}
      </span>
    </div>
  );
}

interface ArchiveTotalsRowProps {
  durationLabel: string | null;
  sizeLabel: string | null;
}

export function ArchiveTotalsRow({
  durationLabel,
  sizeLabel,
}: ArchiveTotalsRowProps) {
  if (!durationLabel && !sizeLabel) return null;

  return (
    <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
      {durationLabel ? (
        <ArchiveTotalStat
          icon={<Clock className="h-5 w-5" />}
          value={durationLabel}
          label="Продолжительность"
          caption="суммарный хронометраж каталога"
        />
      ) : null}
      {sizeLabel ? (
        <ArchiveTotalStat
          icon={<HardDrive className="h-5 w-5" />}
          value={sizeLabel}
          label="Объём"
          caption="файлы релизов в каталоге"
        />
      ) : null}
    </div>
  );
}
