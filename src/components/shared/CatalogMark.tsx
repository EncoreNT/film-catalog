"use client";

import type { LucideIcon } from "lucide-react";
import { HoverTooltip } from "@/components/primitives/HoverTooltip";

export type CatalogMarkTone = "cyan" | "accent";

const MARK_TONE: Record<
  CatalogMarkTone,
  {
    border: string;
    bg: string;
    hoverBorder: string;
    hoverBg: string;
    icon: string;
  }
> = {
  cyan: {
    border: "border-cyan/50",
    bg: "bg-cyan/[0.1]",
    hoverBorder: "hover:border-cyan/75",
    hoverBg: "hover:bg-cyan/[0.16]",
    icon: "text-cyan",
  },
  accent: {
    border: "border-accent/50",
    bg: "bg-accent/[0.1]",
    hoverBorder: "hover:border-accent/75",
    hoverBg: "hover:bg-accent/[0.16]",
    icon: "text-accent-bright",
  },
};

interface CatalogMarkProps {
  icon: LucideIcon;
  label: string;
  detail?: string;
  tone?: CatalogMarkTone;
  className?: string;
}

/** Compact circular catalog mark with hover tooltip (TV-ready, external disk, …). */
export function CatalogMark({
  icon: Icon,
  label,
  detail,
  tone = "cyan",
  className = "",
}: CatalogMarkProps) {
  const t = MARK_TONE[tone];
  const ariaLabel = detail ? `${label}: ${detail}` : label;

  return (
    <HoverTooltip
      className={`inline-flex shrink-0 cursor-help ${className}`}
      content={
        <div className="px-3 py-2">
          <p className="text-xs font-medium text-text">{label}</p>
          {detail ? (
            <p className="mt-0.5 font-mono-tech text-[0.6rem] leading-snug text-muted">
              {detail}
            </p>
          ) : null}
        </div>
      }
    >
      <span
        className={`inline-flex h-[1.125rem] w-[1.125rem] items-center justify-center rounded-full border shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] transition-colors duration-200 ${t.border} ${t.bg} ${t.hoverBorder} ${t.hoverBg}`}
        aria-label={ariaLabel}
      >
        <Icon className={`h-3 w-3 ${t.icon}`} strokeWidth={1.75} aria-hidden />
      </span>
    </HoverTooltip>
  );
}
