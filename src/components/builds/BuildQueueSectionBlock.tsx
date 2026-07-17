"use client";

import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { Archive, AlertTriangle, ChevronDown, Layers3, LoaderCircle } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useReducedMotion } from "motion/react";
import {
  defaultBuildSectionOpen,
  type BuildQueueSectionId,
} from "@/lib/builds/build-queue-display";

const SECTION_ICON: Record<BuildQueueSectionId, LucideIcon> = {
  running: LoaderCircle,
  queued: Layers3,
  failed: AlertTriangle,
  archive: Archive,
};

const SECTION_ICON_CLASS: Record<BuildQueueSectionId, string> = {
  running: "border-accent/35 bg-accent/[0.08] text-accent-bright",
  queued: "border-neural/35 bg-neural/[0.08] text-neural-bright",
  failed: "border-danger/35 bg-danger/[0.08] text-danger",
  archive: "border-border bg-bg-deep/40 text-muted",
};

interface BuildQueueSectionBlockProps {
  id: BuildQueueSectionId;
  title: string;
  hint?: string;
  count: number;
  defaultOpen?: boolean;
  children: ReactNode;
}

export function BuildQueueSectionBlock({
  id,
  title,
  hint,
  count,
  defaultOpen,
  children,
}: BuildQueueSectionBlockProps) {
  const [open, setOpen] = useState(defaultOpen ?? defaultBuildSectionOpen(id));
  const sectionRef = useRef<HTMLElement>(null);
  const scrollOnExpandRef = useRef(false);
  const reduceMotion = useReducedMotion();
  const Icon = SECTION_ICON[id];

  const handleToggle = () => {
    if (!open) scrollOnExpandRef.current = true;
    setOpen((value) => !value);
  };

  useLayoutEffect(() => {
    if (!open || !scrollOnExpandRef.current) return;
    scrollOnExpandRef.current = false;
    sectionRef.current?.scrollIntoView({
      behavior: reduceMotion ? "auto" : "smooth",
      block: "start",
    });
  }, [open, reduceMotion]);

  return (
    <section
      ref={sectionRef}
      id={`build-queue-${id}`}
      className="scroll-mt-6 overflow-hidden rounded-[var(--radius)] border border-border/80 bg-bg-elevated/20"
    >
      <button
        type="button"
        onClick={handleToggle}
        aria-expanded={open}
        aria-controls={`build-queue-panel-${id}`}
        className="focus-ring flex w-full items-start gap-3 px-4 py-3.5 text-left sm:px-5 sm:py-4"
      >
        <span
          className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-sm)] border ${SECTION_ICON_CLASS[id]}`}
          aria-hidden
        >
          <Icon
            className={`h-4 w-4 ${id === "running" && open ? "animate-spin" : ""}`}
            strokeWidth={1.5}
          />
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <h2 className="font-display text-lg font-semibold text-text">{title}</h2>
            <span className="font-mono-tech text-[10px] uppercase tracking-[0.14em] text-faint">
              {count}
            </span>
          </div>
          {hint ? (
            <p className="mt-1 max-w-2xl text-sm text-muted">{hint}</p>
          ) : null}
        </div>

        <ChevronDown
          className={`mt-1 h-4 w-4 shrink-0 text-muted transition-transform duration-300 ease-out ${
            open ? "" : "-rotate-90"
          }`}
          strokeWidth={1.5}
          aria-hidden
        />
      </button>

      {open ? (
        <div
          id={`build-queue-panel-${id}`}
          className="border-t border-border/60 px-3 py-3 sm:px-4 sm:py-4"
        >
          {children}
        </div>
      ) : null}
    </section>
  );
}
