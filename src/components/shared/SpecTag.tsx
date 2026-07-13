import type { ReactNode } from "react";
import type { SpecTagKind } from "@/lib/media/spec-tags";

interface SpecTagProps {
  kind: SpecTagKind;
  icon?: ReactNode;
  children: ReactNode;
  /** Привязка к дорожке, напр. язык — «RUS», для tooltip/title. */
  note?: string;
  sharp?: boolean;
}

/* One cohesive badge language across the whole page — a flat machined
   "instrument plaque" rather than a gold-framed jewel.

   - Premium technical specs (4K / HDR / Atmos) sit on a dark elevated
     plaque with a thin neutral frame and a 2px gold left-edge accent bar.
     The gold shows up only as that edge plus the mono label/icon, so the
     elite tier reads as a labelled instrument strip, not a glowing chip.
   - Regular technical specs (codec / channels / audio format / release
     source) use the same plaque shape with a neutral frame and no accent
     bar, so gold stays a single, deliberate accent.
   - Every chip shares border weight, radius, padding and an inset top
     highlight for a consistent physical feel. No outer neon glow. */
const KIND_STYLES: Record<
  SpecTagKind,
  { accent: string; border: string; bg: string; highlight: string }
> = {
  resolution: {
    accent: "text-accent-bright",
    border: "border border-border-strong border-l-2 border-l-accent/70",
    bg: "bg-bg-elevated",
    highlight: "shadow-[inset_0_1px_0_rgba(255,255,255,0.07)]",
  },
  hdr: {
    accent: "text-accent-bright",
    border: "border border-border-strong border-l-2 border-l-accent/70",
    bg: "bg-bg-elevated",
    highlight: "shadow-[inset_0_1px_0_rgba(255,255,255,0.07)]",
  },
  "audio-3d": {
    accent: "text-accent-bright",
    border: "border border-border-strong border-l-2 border-l-accent/70",
    bg: "bg-bg-elevated",
    highlight: "shadow-[inset_0_1px_0_rgba(255,255,255,0.07)]",
  },
  audio: {
    accent: "text-text",
    border: "border border-border-strong",
    bg: "bg-bg-elevated",
    highlight: "shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]",
  },
  channel: {
    accent: "text-muted",
    border: "border border-border-strong",
    bg: "bg-bg-elevated/80",
    highlight: "shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]",
  },
  codec: {
    accent: "text-muted",
    border: "border border-border-strong",
    bg: "bg-bg-elevated/80",
    highlight: "shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]",
  },
  version: {
    accent: "text-text",
    border: "border border-border-strong",
    bg: "bg-bg-surface",
    highlight: "shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]",
  },
  release: {
    accent: "text-text",
    border: "border border-border-strong",
    bg: "bg-bg-surface",
    highlight: "shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]",
  },
};

export type { SpecTagKind } from "@/lib/media/spec-tags";

export function SpecTag({
  kind,
  icon,
  children,
  note,
  sharp = false,
}: SpecTagProps) {
  const s = KIND_STYLES[kind];
  return (
    <span
      className={`font-mono inline-flex items-center gap-1.5 px-2 py-0.5 text-[0.65rem] font-medium tracking-wide ${sharp ? "rounded-none" : "rounded-md"} ${s.accent} ${s.border} ${s.bg} ${s.highlight}`}
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
