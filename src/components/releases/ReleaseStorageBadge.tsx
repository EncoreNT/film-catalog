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
        className="inline-flex max-w-full items-center gap-2"
        aria-label={`Внешний диск: ${label}`}
      >
        <Plug className="h-4 w-4 shrink-0 text-accent" aria-hidden />
        <p className="min-w-0 truncate text-xs leading-snug">
          <span className="font-medium text-accent">{label}</span>
          <span className="font-mono-tech text-accent/55"> · внешний диск</span>
        </p>
      </div>
    );
  }

  return (
    <div
      className="inline-flex max-w-full items-center gap-2"
      aria-label={label}
    >
      <HardDrive className="h-4 w-4 shrink-0 text-muted" aria-hidden />
      <p className="min-w-0 truncate text-xs leading-snug">
        <span className="text-text">{label}</span>
        <span className="font-mono-tech text-faint"> · этот компьютер</span>
      </p>
    </div>
  );
}
