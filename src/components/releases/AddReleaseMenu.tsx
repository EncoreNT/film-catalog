"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { Disc3, Plus, Wand2 } from "lucide-react";
import { ReleaseMenuItem } from "@/components/releases/ReleaseMenuItem";

export function AddReleaseMenu({
  movieSlug,
  sourceReleaseId,
}: {
  movieSlug: string;
  sourceReleaseId: number;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) close();
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, close]);

  return (
    <div ref={rootRef} className="relative flex shrink-0 items-center self-center px-1">
      <button
        type="button"
        className={`focus-ring inline-flex h-8 w-8 items-center justify-center rounded-[var(--radius-sm)] transition-colors ${
          open
            ? "bg-bg-surface text-accent"
            : "text-faint hover:bg-bg-surface hover:text-accent"
        }`}
        aria-label="Добавить релиз"
        title="Добавить релиз"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((value) => !value)}
      >
        <Plus className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
      </button>
      {open ? (
        <div
          id={menuId}
          className="absolute left-0 top-full z-30 pt-1"
          role="menu"
          aria-label="Как добавить релиз"
        >
          <div className="min-w-[15rem] overflow-hidden rounded-[var(--radius)] border border-border-strong bg-bg-elevated py-1 shadow-[0_12px_32px_rgba(0,0,0,0.55)]">
            <ReleaseMenuItem
              label="Собрать"
              href={`/movies/${movieSlug}/builds/new?release=${sourceReleaseId}`}
              icon={<Wand2 className="h-3.5 w-3.5 shrink-0" aria-hidden />}
            />
            <ReleaseMenuItem
              label="Собрать из BDMV"
              href={`/movies/${movieSlug}/releases/from-bdmv`}
              icon={<Disc3 className="h-3.5 w-3.5 shrink-0" aria-hidden />}
            />
            <ReleaseMenuItem
              label="Просто добавить"
              href={`/movies/${movieSlug}/releases/new`}
              icon={<Plus className="h-3.5 w-3.5 shrink-0" aria-hidden />}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
