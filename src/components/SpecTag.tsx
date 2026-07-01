import type { ReactNode } from "react";

export type SpecTagKind =
  | "resolution"
  | "hdr"
  | "audio-3d"
  | "audio"
  | "release"
  | "version"
  | "channel"
  | "codec";

interface SpecTagProps {
  kind: SpecTagKind;
  icon?: ReactNode;
  children: ReactNode;
  /** Привязка к дорожке, напр. язык — «RUS», для tooltip/title. */
  note?: string;
}

const KIND_STYLES: Record<
  SpecTagKind,
  { accent: string; border: string; bg: string; glow?: boolean }
> = {
  resolution: {
    accent: "text-accent",
    border: "border-accent/40",
    bg: "bg-accent/10",
    glow: true,
  },
  hdr: {
    accent: "text-accent-bright",
    border: "border-accent-bright/45",
    bg: "bg-accent-bright/12",
    glow: true,
  },
  "audio-3d": {
    accent: "text-accent-bright",
    border: "border-accent-bright/50",
    bg: "bg-accent-bright/14",
    glow: true,
  },
  audio: {
    accent: "text-text",
    border: "border-border-strong",
    bg: "bg-bg-elevated",
  },
  release: {
    accent: "text-text",
    border: "border-border-strong",
    bg: "bg-bg-surface",
  },
  version: {
    accent: "text-accent-bright",
    border: "border-accent/45",
    bg: "bg-accent/12",
  },
  channel: {
    accent: "text-muted",
    border: "border-border",
    bg: "bg-bg-surface",
  },
  codec: {
    accent: "text-muted",
    border: "border-border",
    bg: "bg-bg-elevated",
  },
};

export function SpecTag({ kind, icon, children, note }: SpecTagProps) {
  const s = KIND_STYLES[kind];
  return (
    <span
      className={`font-mono inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium tracking-wide ${s.accent} ${s.border} ${s.bg} ${
        s.glow ? "shadow-[0_0_14px_var(--accent-glow)]" : ""
      }`}
      title={note}
    >
      {icon ? (
        <span className="flex shrink-0 items-center" aria-hidden>
          {icon}
        </span>
      ) : null}
      <span>{children}</span>
    </span>
  );
}
