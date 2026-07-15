"use client";

import Image from "next/image";
import { CalendarClock, Film, Plus, X } from "lucide-react";
import type { EditableSlot } from "@/components/franchises/FranchiseSlotsEditor";
import { UnderlineLines } from "@/components/primitives/Field";
import { NeuralSwitch } from "@/components/primitives/NeuralSwitch";
import { MAX_YEAR, MIN_YEAR, clampYear } from "@/components/primitives/YearInput";
import { trimOnInputBlur } from "@/lib/shared/text-trim";
import { isFutureFranchiseSlotState, canMarkSlotUnreleased } from "@/lib/franchises/franchise-slot-future";
import {
  FRANCHISE_SLOT_FUTURE_HEADLINE,
  franchiseSlotFutureFooter,
} from "@/lib/franchises/franchise-slot-copy";

function editableSlotYear(slot: EditableSlot): number | null {
  if (slot.movieYear != null) return slot.movieYear;
  return slot.yearHint ?? null;
}

interface FranchiseSlotCardProps {
  slot: EditableSlot;
  index: number;
  total: number;
  onPick: () => void;
  onClear: () => void;
  onMove: (direction: -1 | 1) => void;
  onRemove: () => void;
  onHintChange: (field: "titleHint" | "yearHint", value: string) => void;
  onAnnouncedChange: (value: boolean) => void;
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
  onAnnouncedChange,
}: FranchiseSlotCardProps) {
  const filled = slot.movieId != null;
  const cover = filled && slot.coverUrl ? slot.coverUrl : null;
  const year = editableSlotYear(slot);
  const isFutureEmpty =
    !filled &&
    isFutureFranchiseSlotState({
      year,
      filled: false,
      isAnnounced: slot.isAnnounced,
    });
  const canLink = !isFutureEmpty;
  const isUnreleased = slot.isAnnounced ?? false;
  const showUnreleasedSwitch =
    !filled && (isUnreleased || canMarkSlotUnreleased(slot.yearHint));
  const hideYearField = isUnreleased;

  const topLaserClass = filled
    ? "via-accent/45"
    : isFutureEmpty
      ? "via-neural/50"
      : "via-ember/40";
  const shellBorderClass = filled
    ? "border-border-strong hover:border-accent/35"
    : isFutureEmpty
      ? "border-border-neural"
      : "border-border-strong";
  const leftAccentClass = filled
    ? "via-accent/50"
    : isFutureEmpty
      ? "via-neural/45"
      : "via-ember/40";

  return (
    <article
      className={`group relative rounded-[var(--radius-sm)] border ${shellBorderClass} glow-card-rest bg-bg-elevated/55 p-1 transition-[border-color,box-shadow] duration-200`}
      style={{
        animation: `movieCardIn 0.4s var(--ease) ${Math.min(index, 8) * 35}ms both`,
      }}
    >
      <div className="spec-plaque-core relative flex gap-3 overflow-hidden rounded-[calc(var(--radius-sm)-3px)] px-2.5 py-2">
        <span
          aria-hidden
          className={`pointer-events-none absolute inset-x-2.5 top-0 z-[1] h-px bg-gradient-to-r from-transparent ${topLaserClass} to-transparent`}
        />
        {/* Left accent line — gold when linked, neural when future, ember when empty. */}
        <span
          aria-hidden
          className={`pointer-events-none absolute inset-y-2 left-0 z-[1] w-px bg-gradient-to-b from-transparent ${leftAccentClass} to-transparent`}
        />
      {canLink ? (
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
            ? "border-border-strong bg-bg-deep/40 hover:border-accent/60 hover:shadow-[0_0_18px_rgba(232,176,90,0.3)]"
            : "border-dashed border-ember/50 bg-bg-deep/55 hover:border-ember/75"
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
      ) : (
        <span
          className="relative flex h-16 w-11 shrink-0 items-center justify-center overflow-hidden rounded-[var(--radius-sm)] border border-dashed border-neural/55 bg-bg-deep/55"
          title={FRANCHISE_SLOT_FUTURE_HEADLINE}
        >
          <CalendarClock className="h-5 w-5 text-neural/65" aria-hidden />
        </span>
      )}

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
          <div className="grid grid-cols-[1fr_5.5rem] gap-3">
            <div className="relative">
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
                className="peer min-h-9 w-full border-0 bg-transparent px-1 py-1 text-xs text-text outline-none placeholder:text-muted/50"
              />
              <UnderlineLines />
            </div>
            <div
              className={`relative ${hideYearField ? "pointer-events-none invisible" : ""}`}
              aria-hidden={hideYearField}
            >
              <input
                type="text"
                inputMode="numeric"
                value={slot.yearHint ?? ""}
                onChange={(e) =>
                  onHintChange(
                    "yearHint",
                    e.target.value.replace(/\D/g, "").slice(0, 4),
                  )
                }
                onBlur={() => {
                  const n =
                    slot.yearHint == null ? null : Number(slot.yearHint);
                  if (n != null && (n < MIN_YEAR || n > MAX_YEAR)) {
                    onHintChange("yearHint", String(clampYear(n)));
                  }
                }}
                onClick={(e) => e.stopPropagation()}
                placeholder="год"
                aria-label={`Фильм ${index + 1}: год`}
                className="peer font-mono-tech min-h-9 w-full border-0 bg-transparent px-1 py-1 text-center text-xs tabular-nums text-text outline-none placeholder:text-muted/50"
              />
              <UnderlineLines />
            </div>
          </div>
        )}

        {showUnreleasedSwitch ? (
          <NeuralSwitch
            checked={isUnreleased}
            onChange={onAnnouncedChange}
            label="ещё не вышел"
            ariaLabel={`Фильм ${index + 1}: ещё не вышел`}
          />
        ) : null}

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
          <div className="min-h-5">
            {!isFutureEmpty ? (
              <button
                type="button"
                onClick={onPick}
                className="focus-ring font-mono-tech block cursor-pointer text-[0.65rem] leading-5 text-accent/80 transition-colors hover:text-accent"
              >
                + добавить фильм из каталога
              </button>
            ) : (
              <p
                className={`font-mono-tech text-[0.65rem] leading-5 ${
                  year != null ? "text-muted" : "text-transparent select-none"
                }`}
                aria-hidden={year == null}
              >
                {year != null
                  ? franchiseSlotFutureFooter(year, false)
                  : "+ добавить фильм из каталога"}
              </p>
            )}
          </div>
        )}
      </div>
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
      className="focus-ring group flex min-h-[5.5rem] cursor-pointer items-center justify-center gap-2.5 rounded-[var(--radius-sm)] border border-dashed border-border-strong bg-bg-elevated/40 p-1 text-faint transition-all duration-200 hover:border-accent/45 hover:text-accent"
    >
      <span className="flex h-full min-h-[4.75rem] w-full flex-col items-center justify-center gap-2.5 rounded-[calc(var(--radius-sm)-3px)] border border-dashed border-border bg-bg-elevated/80 px-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition-colors group-hover:border-accent/35 group-hover:bg-bg-elevated">
        <span className="flex h-8 w-8 items-center justify-center rounded-full border border-border-strong bg-bg-deep transition-colors group-hover:border-accent/50 group-hover:bg-accent/10 group-hover:shadow-[0_0_14px_rgba(232,176,90,0.3)]">
          <Plus className="h-4 w-4" aria-hidden />
        </span>
        <span className="font-mono-tech text-xs">добавить фильм</span>
      </span>
    </button>
  );
}
