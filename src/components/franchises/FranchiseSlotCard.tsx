"use client";

import Image from "next/image";
import { Film, X } from "lucide-react";
import type { EditableSlot } from "@/components/franchises/FranchiseSlotsEditor";
import { trimOnInputBlur } from "@/lib/shared/text-trim";

interface FranchiseSlotCardProps {
  slot: EditableSlot;
  index: number;
  total: number;
  onPick: () => void;
  onClear: () => void;
  onMove: (direction: -1 | 1) => void;
  onRemove: () => void;
  onHintChange: (field: "titleHint" | "yearHint", value: string) => void;
}

export function FranchiseSlotCard({
  slot,
  index,
  total,
  onPick,
  onClear,
  onMove,
  onRemove,
  onHintChange,
}: FranchiseSlotCardProps) {
  const filled = slot.movieId != null;
  const cover = filled && slot.coverUrl ? slot.coverUrl : null;

  return (
    <article
      className="surface-card group flex gap-3 p-2.5"
      style={{
        animation: `movieCardIn 0.4s var(--ease) ${Math.min(index, 8) * 35}ms both`,
      }}
    >
      <button
        type="button"
        onClick={onPick}
        aria-label={
          filled
            ? `Фильм ${index + 1}: ${slot.movieTitle} — сменить`
            : `Фильм ${index + 1}: добавить фильм из каталога`
        }
        className={`focus-ring group relative h-16 w-11 shrink-0 cursor-pointer overflow-hidden rounded-[var(--radius-sm)] border transition-all duration-200 ${
          filled
            ? "border-border-strong hover:border-accent/60 hover:shadow-[0_0_18px_var(--accent-glow)]"
            : "border-dashed border-ember/40 bg-bg-surface/30 hover:border-ember/70"
        }`}
      >
        {filled ? (
          cover ? (
            <Image
              src={cover}
              alt={slot.movieTitle ?? ""}
              fill
              unoptimized
              sizes="44px"
              className="object-cover"
            />
          ) : (
            <span className="flex h-full items-center justify-center text-accent/60">
              <Film className="h-5 w-5" aria-hidden />
            </span>
          )
        ) : (
          <span className="flex h-full items-center justify-center text-ember/50">
            <Film className="h-5 w-5" aria-hidden />
          </span>
        )}
      </button>

      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="flex items-center justify-between gap-2">
          <span className="font-mono-tech shrink-0 text-[0.65rem] text-faint">
            фильм {index + 1}
            <span className="text-faint/60"> / {total}</span>
          </span>
          <div className="flex items-center gap-0.5">
            <button
              type="button"
              onClick={() => onMove(-1)}
              disabled={index === 0}
              aria-label={`Фильм ${index + 1}: выше`}
              className="focus-ring flex h-6 w-6 cursor-pointer items-center justify-center rounded text-faint transition-colors hover:bg-bg-surface hover:text-accent disabled:cursor-not-allowed disabled:opacity-30"
            >
              <span className="text-xs leading-none" aria-hidden>↑</span>
            </button>
            <button
              type="button"
              onClick={() => onMove(1)}
              disabled={index === total - 1}
              aria-label={`Фильм ${index + 1}: ниже`}
              className="focus-ring flex h-6 w-6 cursor-pointer items-center justify-center rounded text-faint transition-colors hover:bg-bg-surface hover:text-accent disabled:cursor-not-allowed disabled:opacity-30"
            >
              <span className="text-xs leading-none" aria-hidden>↓</span>
            </button>
            <button
              type="button"
              onClick={onRemove}
              aria-label={`Удалить фильм ${index + 1}`}
              className="focus-ring flex h-6 w-6 cursor-pointer items-center justify-center rounded text-faint transition-colors hover:text-danger"
            >
              <X className="h-3.5 w-3.5" aria-hidden />
            </button>
          </div>
        </div>

        {filled ? (
          <button
            type="button"
            onClick={onPick}
            className="focus-ring block w-full truncate text-left text-sm font-medium text-text hover:text-accent"
          >
            {slot.movieTitle}
            {slot.movieYear ? (
              <span className="font-mono-tech ml-2 text-xs text-muted">
                {slot.movieYear}
              </span>
            ) : null}
          </button>
        ) : (
          <div className="grid grid-cols-[1fr_4rem] gap-2">
            <input
              value={slot.titleHint ?? ""}
              onChange={(e) => onHintChange("titleHint", e.target.value)}
              onBlur={(e) =>
                trimOnInputBlur(e, (ev) =>
                  onHintChange("titleHint", ev.target.value),
                )
              }
              onClick={(e) => e.stopPropagation()}
              placeholder="название (необязательно)"
              aria-label={`Фильм ${index + 1}: название`}
              className="focus-ring min-h-8 w-full rounded-[var(--radius-sm)] border border-border bg-bg-surface px-2 py-1 text-xs text-text placeholder:text-muted/60"
            />
            <input
              type="number"
              value={slot.yearHint ?? ""}
              onChange={(e) => onHintChange("yearHint", e.target.value)}
              onClick={(e) => e.stopPropagation()}
              placeholder="год"
              aria-label={`Фильм ${index + 1}: год`}
              className="focus-ring font-mono-tech min-h-8 w-full rounded-[var(--radius-sm)] border border-border bg-bg-surface px-2 py-1 text-xs text-text placeholder:text-muted/60"
            />
          </div>
        )}

        {filled ? (
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={onPick}
              className="focus-ring font-mono-tech cursor-pointer text-[0.65rem] text-muted transition-colors hover:text-accent"
            >
              сменить фильм
            </button>
            <button
              type="button"
              onClick={onClear}
              className="focus-ring font-mono-tech inline-flex cursor-pointer items-center gap-0.5 text-[0.65rem] text-faint transition-colors hover:text-ember"
            >
              <X className="h-3 w-3" aria-hidden />
              отвязать
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={onPick}
            className="focus-ring font-mono-tech block cursor-pointer text-[0.65rem] text-accent/80 transition-colors hover:text-accent"
          >
            + добавить фильм из каталога
          </button>
        )}
      </div>
    </article>
  );
}

interface AddSlotButtonProps {
  onAdd: () => void;
}

export function AddSlotButton({ onAdd }: AddSlotButtonProps) {
  return (
    <button
      type="button"
      onClick={onAdd}
      aria-label="Добавить фильм"
      className="focus-ring group flex min-h-[5.5rem] cursor-pointer items-center justify-center gap-2.5 rounded-[var(--radius-sm)] border-2 border-dashed border-border-strong bg-bg-surface/20 px-4 text-faint transition-all duration-200 hover:border-accent/50 hover:bg-bg-surface-hover hover:text-accent hover:shadow-[0_0_18px_var(--accent-glow)]"
    >
      <span className="flex h-8 w-8 items-center justify-center rounded-full border border-border-strong bg-bg-elevated transition-colors group-hover:border-accent/50 group-hover:bg-accent/10">
        <span className="text-lg leading-none" aria-hidden>+</span>
      </span>
      <span className="font-mono-tech text-xs">добавить фильм</span>
    </button>
  );
}
