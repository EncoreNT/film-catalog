"use client";

import { useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { TierDot } from "@/components/builds/BuildAtoms";
import type { TierTone } from "@/lib/builds/build-display";

interface BuildKindSectionProps {
  icon: LucideIcon;
  label: string;
  /** Краткая информация, видна в свёрнутом и развёрнутом состоянии. */
  brief: ReactNode;
  /** Tier-цвет заголовка (подкрашивает иконку и точку). */
  tone: TierTone;
  defaultOpen?: boolean;
  /** Пуста ли секция — влияет на тон брифа. */
  empty?: boolean;
  children: ReactNode;
}

export function BuildKindSection({
  icon: Icon,
  label,
  brief,
  tone,
  defaultOpen = true,
  empty = false,
  children,
}: BuildKindSectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section className="overflow-hidden rounded-[var(--radius)] border border-border bg-bg-elevated/40">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="focus-ring flex w-full items-center gap-3 px-3.5 py-3 text-left sm:px-4"
      >
        <span
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-sm)] border ${
            empty
              ? "border-border bg-bg-deep/40 text-faint"
              : tone === "ruby"
                ? "border-crimson/35 bg-crimson/[0.08] text-crimson-bright"
                : tone === "gold"
                  ? "border-accent/35 bg-accent/[0.08] text-accent"
                  : "border-neural/35 bg-neural/[0.08] text-neural-bright"
          }`}
          aria-hidden
        >
          <Icon className="h-4 w-4" strokeWidth={1.5} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-mono-tech text-[10px] uppercase tracking-[0.22em] text-muted">
            {label}
          </p>
          <div className="mt-0.5 flex items-center gap-1.5">
            {!empty ? <TierDot tone={tone} /> : null}
            <span
              className={`font-mono-tech truncate text-[11px] uppercase tracking-[0.1em] ${
                empty ? "text-faint" : "text-text"
              }`}
            >
              {brief}
            </span>
          </div>
        </div>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-muted transition-transform duration-300 ease-out ${
            open ? "" : "-rotate-90"
          }`}
          strokeWidth={1.5}
          aria-hidden
        />
      </button>
      {open ? (
        <div className="border-t border-border/60 px-3.5 py-3 sm:px-4">{children}</div>
      ) : null}
    </section>
  );
}
