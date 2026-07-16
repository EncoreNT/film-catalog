"use client";

import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { AlertTriangle, Info } from "lucide-react";
import {
  kindMeta,
  specTagClass,
  type SpecTag,
  type TierTone,
  TIER_TONE,
} from "@/lib/builds/build-display";
import type { BuildTrackKind } from "@/lib/builds/build-recipe-state";

/** Mono-tech spec chip: `4K`, `E-AC3`, `5.1`, `Русский`… */
export function SpecChip({ tag, active }: { tag: SpecTag; active?: boolean }) {
  return (
    <span
      className={`font-mono-tech inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-[0.12em] transition-colors ${
        active
          ? "border-accent/55 bg-accent/[0.12] text-accent-bright"
          : `border-border bg-bg-deep/50 ${specTagClass(tag)}`
      }`}
    >
      {tag.label}
    </span>
  );
}

/** Kind glyph in a tinted pill — video / audio / subtitle. */
export function KindBadge({ kind, size = "md" }: { kind: BuildTrackKind; size?: "sm" | "md" }) {
  const meta = kindMeta(kind);
  const Icon: LucideIcon = meta.icon;
  const box = size === "sm" ? "h-7 w-7" : "h-9 w-9";
  const glyph = size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4";
  return (
    <span
      className={`inline-flex ${box} shrink-0 items-center justify-center rounded-[var(--radius-sm)] border ${meta.pill}`}
      aria-hidden
    >
      <Icon className={glyph} strokeWidth={1.5} />
    </span>
  );
}

/** Tier-colored signal dot. */
export function TierDot({ tone }: { tone: TierTone }) {
  return (
    <span
      className={`inline-block h-1.5 w-1.5 rounded-full ${TIER_TONE[tone].dot}`}
      aria-hidden
    />
  );
}

/** Contextual note with icon — warnings, transcode hints, inline guidance. */
export function BuildInlineHint({
  title,
  children,
  tone = "warning",
}: {
  title?: string;
  children: ReactNode;
  tone?: "warning" | "info";
}) {
  const Icon = tone === "warning" ? AlertTriangle : Info;
  return (
    <div
      role="status"
      className={`flex items-start gap-2.5 rounded-[var(--radius-sm)] border px-3 py-2.5 ${
        tone === "warning"
          ? "border-ember/30 bg-ember/[0.06]"
          : "border-border/60 bg-bg-deep/35"
      }`}
    >
      <Icon
        className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${
          tone === "warning" ? "text-ember-bright" : "text-muted"
        }`}
        strokeWidth={1.5}
        aria-hidden
      />
      <div className="min-w-0 space-y-0.5 text-xs leading-relaxed">
        {title ? <p className="font-medium text-text">{title}</p> : null}
        <p className="text-muted">{children}</p>
      </div>
    </div>
  );
}

/** Mono-tech eyebrow label for a zone header. */
export function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <span className="font-mono-tech text-[10px] uppercase tracking-[0.22em] text-muted">
      {children}
    </span>
  );
}

interface ChipButtonProps {
  selected: boolean;
  onClick: () => void;
  children: ReactNode;
  disabled?: boolean;
  title?: string;
}

/** Selectable pill — used for codec / bitrate / channel / mode choices. */
export function ChipButton({
  selected,
  onClick,
  children,
  disabled,
  title,
}: ChipButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-pressed={selected}
      className={`focus-ring font-mono-tech min-h-8 rounded-full border px-3 py-1 text-[11px] uppercase tracking-[0.1em] transition-all duration-200 ease-out ${
        selected
          ? "border-accent bg-accent/[0.14] text-accent-bright shadow-[0_0_10px_var(--accent-glow)]"
          : "border-border bg-bg-deep/40 text-muted hover:border-border-strong hover:text-text"
      } ${disabled ? "cursor-not-allowed opacity-40" : "cursor-pointer"}`}
    >
      {children}
    </button>
  );
}

/** Reorder handle button (up/down). */
export function ReorderButton({
  direction,
  onClick,
  disabled,
  label,
  Icon,
}: {
  direction: "up" | "down";
  onClick: () => void;
  disabled: boolean;
  label: string;
  Icon: LucideIcon;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className={`focus-ring flex h-7 w-7 items-center justify-center rounded-[var(--radius-sm)] text-muted transition-colors hover:bg-white/[0.06] hover:text-text disabled:cursor-not-allowed disabled:opacity-30`}
    >
      <Icon className={`h-3.5 w-3.5 ${direction === "down" ? "rotate-180" : ""}`} strokeWidth={1.5} />
    </button>
  );
}
