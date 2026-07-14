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

/* A unified machined "spec pill" for inline technical badges inside the
   release console (audio format / channels / codec / HDR / resolution).

   One cohesive badge language: a glass pill with a hairline frame, an
   inset top highlight, and a quiet hover. Premium kinds (4K / HDR /
   Atmos) sit on a warm gold glass fill so the elite tier reads inside
   the dense audio table too; regular kinds stay neutral so gold stays
   a single, deliberate accent. Slightly larger than the old plaque so
   values like "7.1" and "AC3" stay legible inline. */
const KIND_STYLES: Record<
  SpecTagKind,
  { text: string; border: string; bg: string }
> = {
  resolution: {
    text: "text-accent-bright",
    border: "border-accent/30",
    bg: "bg-accent/[0.06]",
  },
  hdr: {
    text: "text-accent-bright",
    border: "border-accent/30",
    bg: "bg-accent/[0.06]",
  },
  "audio-3d": {
    text: "text-accent-bright",
    border: "border-accent/30",
    bg: "bg-gradient-to-r from-accent/[0.12] to-accent/[0.02]",
  },
  audio: {
    text: "text-text",
    border: "border-border-strong",
    bg: "bg-bg-elevated/70",
  },
  channel: {
    text: "text-text",
    border: "border-border-strong",
    bg: "bg-bg-elevated/60",
  },
  codec: {
    text: "text-muted",
    border: "border-border-strong",
    bg: "bg-bg-elevated/70",
  },
  version: {
    text: "text-text",
    border: "border-border-strong",
    bg: "bg-bg-surface",
  },
  release: {
    text: "text-text",
    border: "border-border-strong",
    bg: "bg-bg-surface",
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
      className={`font-mono inline-flex items-center gap-1.5 border px-2.5 py-1 text-[0.7rem] font-medium tracking-wide shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] transition-colors hover:border-accent/35 ${sharp ? "rounded-none" : "rounded-md"} ${s.text} ${s.border} ${s.bg}`}
      title={note}
    >
      {icon ? (
        <span className="flex shrink-0 items-center opacity-90" aria-hidden>
          {icon}
        </span>
      ) : null}
      <span>{children}</span>
    </span>
  );
}
