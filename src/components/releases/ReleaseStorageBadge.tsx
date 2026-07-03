import { HardDrive, Plug } from "lucide-react";

interface ReleaseStorageBadgeProps {
  label: string;
  external: boolean;
}

export function ReleaseStorageBadge({
  label,
  external,
}: ReleaseStorageBadgeProps) {
  if (external) {
    return (
      <div
        className="mt-3 inline-flex max-w-full items-center gap-2.5 rounded-[var(--radius-sm)] border border-accent/45 bg-accent/[0.1] px-3 py-1.5 shadow-[0_0_20px_-8px_var(--accent-glow)]"
        aria-label={`Внешний диск: ${label}`}
      >
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-accent/35 bg-accent/15">
          <Plug className="h-3.5 w-3.5 text-accent" aria-hidden />
        </span>
        <div className="min-w-0 text-left">
          <p className="truncate text-sm font-medium leading-snug text-accent">
            {label}
          </p>
          <p className="font-mono-tech mt-0.5 text-accent/60">внешний диск</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="mt-3 inline-flex max-w-full items-center gap-2.5 rounded-[var(--radius-sm)] border border-border-strong bg-bg-elevated px-3 py-1.5"
      aria-label={label}
    >
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-border bg-bg-surface">
        <HardDrive className="h-3.5 w-3.5 text-muted" aria-hidden />
      </span>
      <div className="min-w-0 text-left">
        <p className="text-sm font-medium leading-snug text-text">{label}</p>
        <p className="font-mono-tech mt-0.5 text-faint">этот компьютер</p>
      </div>
    </div>
  );
}
