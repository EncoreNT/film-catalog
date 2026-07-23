import type { ReactNode } from "react";
import type { SpecTagKind } from "@/lib/media/spec-tags";
import {
  tierChipClass,
  type TierChipTone,
} from "@/lib/media/tier-presentation";

interface SpecTagProps {
  kind?: SpecTagKind;
  icon?: ReactNode;
  children: ReactNode;
  /** Привязка к дорожке, напр. язык — «RUS», для tooltip/title. */
  note?: string;
  sharp?: boolean;
  /** `pill` — release console badges; `chip` — compact mono-tech chips on cards/build UI. */
  variant?: "pill" | "chip";
  /** Tier-aware border/text (catalog cards). */
  tone?: TierChipTone;
  /** Gold accent state (build source decks). */
  active?: boolean;
  /** Brighten border on hover + cursor-help. */
  interactive?: boolean;
  /** Extra text class for chip variant (e.g. build specTagClass). */
  textClass?: string;
  /** Chip size: `xs` for catalog cards, `sm` for build queue. */
  size?: "xs" | "sm";
  className?: string;
  title?: string;
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

const CHIP_SIZE = {
  xs: "px-2 py-[3px] text-[0.55rem] tracking-[0.14em]",
  sm: "px-2 py-0.5 text-[10px] tracking-[0.12em]",
} as const;

export type { SpecTagKind } from "@/lib/media/spec-tags";

export function SpecTag({
  kind,
  icon,
  children,
  note,
  sharp = false,
  variant = "pill",
  tone,
  active = false,
  interactive = false,
  textClass = "",
  size = "xs",
  className = "",
  title,
}: SpecTagProps) {
  const resolvedTitle = title ?? note;

  if (variant === "chip") {
    const toneClass = tone
      ? tierChipClass(tone, { interactive })
      : active
        ? "border-accent/55 bg-accent/[0.12] text-accent-bright"
        : `border-border bg-bg-deep/50 ${textClass}`;

    return (
      <span
        className={`font-mono-tech inline-flex items-center gap-1 rounded-full border bg-bg-deep/90 font-semibold uppercase whitespace-nowrap transition-colors duration-200 ${CHIP_SIZE[size]} ${toneClass} ${className}`}
        title={resolvedTitle}
      >
        {icon}
        {children}
      </span>
    );
  }

  if (!kind) {
    throw new Error("SpecTag pill variant requires kind");
  }

  const s = KIND_STYLES[kind];
  return (
    <span
      className={`font-mono inline-flex items-center gap-1.5 border px-2.5 py-1 text-[0.7rem] font-medium tracking-wide shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] transition-colors hover:border-accent/35 ${sharp ? "rounded-none" : "rounded-md"} ${s.text} ${s.border} ${s.bg} ${className}`}
      title={resolvedTitle}
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
