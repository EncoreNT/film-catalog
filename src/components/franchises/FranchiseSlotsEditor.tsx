"use client";

import { useCallback, useState } from "react";
import { Film, Plus } from "lucide-react";
import { Button } from "@/components/primitives/Button";
import { MachinedCard, CardSectionHeader } from "@/components/primitives/MachinedCard";
import { ConfirmDialog } from "@/components/primitives/ConfirmDialog";
import { MoviePickerDialog } from "@/components/franchises/MoviePickerDialog";
import { FranchiseSlotCard, AddSlotButton } from "@/components/franchises/FranchiseSlotCard";
import type { MovieWithTracks } from "@/lib/movies/movie-query";
import type { FranchiseSlotInput } from "@/lib/franchises/franchise-slots";
import { movieCoverUrlFromMovie } from "@/lib/covers/cover-url";
import { trimInputOptional } from "@/lib/shared/text-trim";

export interface EditableSlot {
  key: string;
  movieId: number | null;
  movieTitle?: string;
  movieYear?: number | null;
  coverUrl?: string;
  storyOrder: number;
  titleHint?: string | null;
  yearHint?: number | null;
}

interface FranchiseSlotsEditorProps {
  slots: EditableSlot[];
  onChange: (slots: EditableSlot[]) => void;
}

function reindexStoryOrder(slots: EditableSlot[]): EditableSlot[] {
  return slots.map((slot, i) => ({ ...slot, storyOrder: i + 1 }));
}

export function createEmptySlot(order?: number): EditableSlot {
  return {
    key: crypto.randomUUID(),
    movieId: null,
    storyOrder: order ?? 0,
    titleHint: null,
    yearHint: null,
  };
}

export function slotsToPayload(slots: EditableSlot[]): FranchiseSlotInput[] {
  return slots.map((slot) => ({
    movieId: slot.movieId,
    storyOrder: slot.storyOrder,
    titleHint: trimInputOptional(slot.titleHint),
    yearHint: slot.yearHint ?? null,
  }));
}

export function slotsFromFranchise(
  slots: {
    movieId: number | null;
    storyOrder: number;
    titleHint: string | null;
    yearHint: number | null;
    movie: MovieWithTracks | null;
  }[],
): EditableSlot[] {
  return slots.map((slot) => ({
    key: `slot-${slot.movieId ?? "empty"}-${slot.storyOrder}-${crypto.randomUUID()}`,
    movieId: slot.movieId,
    movieTitle: slot.movie?.title,
    movieYear: slot.movie?.year,
    coverUrl: slot.movie ? movieCoverUrlFromMovie(slot.movie) ?? undefined : undefined,
    storyOrder: slot.storyOrder,
    titleHint: slot.titleHint,
    yearHint: slot.yearHint,
  }));
}

export function FranchiseSlotsEditor({
  slots,
  onChange,
}: FranchiseSlotsEditorProps) {
  const [pickerOpenFor, setPickerOpenFor] = useState<string | null>(null);
  const [removeKey, setRemoveKey] = useState<string | null>(null);

  const addEmptySlot = useCallback(() => {
    onChange(reindexStoryOrder([...slots, createEmptySlot(slots.length + 1)]));
  }, [slots, onChange]);

  const moveSlot = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= slots.length) return;
    const next = [...slots];
    const tmp = next[index];
    next[index] = next[target];
    next[target] = tmp;
    onChange(reindexStoryOrder(next));
  };

  const removeSlot = (key: string) => {
    onChange(reindexStoryOrder(slots.filter((s) => s.key !== key)));
    setRemoveKey(null);
  };

  const pickMovie = (movie: MovieWithTracks) => {
    if (!pickerOpenFor) return;
    onChange(
      slots.map((slot) =>
        slot.key === pickerOpenFor
          ? {
              ...slot,
              movieId: movie.id,
              movieTitle: movie.title,
              movieYear: movie.year,
              coverUrl: movieCoverUrlFromMovie(movie) ?? undefined,
            }
          : slot,
      ),
    );
    setPickerOpenFor(null);
  };

  const clearMovie = (key: string) => {
    onChange(
      slots.map((slot) =>
        slot.key === key
          ? {
              ...slot,
              movieId: null,
              movieTitle: undefined,
              movieYear: undefined,
              coverUrl: undefined,
            }
          : slot,
      ),
    );
  };

  const updateHintField = (
    key: string,
    field: "titleHint" | "yearHint",
    value: string,
  ) => {
    onChange(
      slots.map((slot) =>
        slot.key === key
          ? {
              ...slot,
              [field]:
                field === "yearHint"
                  ? value
                    ? parseInt(value, 10)
                    : null
                  : value || null,
            }
          : slot,
      ),
    );
  };

  const filledCount = slots.filter((s) => s.movieId != null).length;
  const pickerIndex = pickerOpenFor
    ? slots.findIndex((s) => s.key === pickerOpenFor)
    : -1;

  return (
    <MachinedCard variant="calm" bodyClassName="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <CardSectionHeader label="хронология мира" title="Фильмы франшизы" />
        <p className="font-mono-tech text-xs text-muted tabular-nums">
          {filledCount} / {slots.length} во франшизе
        </p>
      </div>

      {slots.length === 0 ? (
        <div className="relative flex flex-col items-center gap-4 overflow-hidden rounded-[var(--radius-sm)] border border-dashed border-border-strong bg-bg-surface/10 px-6 py-10 text-center">
          {/* Top-edge gold laser slit — the drop zone reads as a calibrated
              empty reel bay rather than a flat filled box. */}
          <span
            aria-hidden
            className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-accent/55 to-transparent"
          />
          <span className="relative flex h-12 w-12 items-center justify-center rounded-full border border-border-strong bg-bg-elevated text-accent shadow-[0_0_18px_rgba(232,176,90,0.25)]">
            <Film className="h-5 w-5" aria-hidden />
          </span>
          <div className="space-y-1">
            <p className="text-sm text-text">Франшиза пока пуста</p>
            <p className="text-xs text-muted">
              Добавьте фильмы и привяжите их из каталога
            </p>
          </div>
          <Button type="button" variant="secondary" onClick={addEmptySlot}>
            <Plus className="h-4 w-4" aria-hidden />
            Добавить фильм
          </Button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            {slots.map((slot, index) => (
              <FranchiseSlotCard
                key={slot.key}
                slot={slot}
                index={index}
                total={slots.length}
                onPick={() => setPickerOpenFor(slot.key)}
                onClear={() => clearMovie(slot.key)}
                onMove={(dir) => moveSlot(index, dir)}
                onRemove={() => setRemoveKey(slot.key)}
                onHintChange={(field, value) =>
                  updateHintField(slot.key, field, value)
                }
              />
            ))}
            <AddSlotButton onAdd={addEmptySlot} />
          </div>
        </>
      )}

      <MoviePickerDialog
        open={pickerOpenFor != null}
        onClose={() => setPickerOpenFor(null)}
        onPick={pickMovie}
        excludeIds={slots
          .filter((s) => s.movieId != null && s.key !== pickerOpenFor)
          .map((s) => s.movieId as number)}
        slotLabel={pickerIndex >= 0 ? `Фильм ${pickerIndex + 1}` : undefined}
      />

      <ConfirmDialog
        open={removeKey != null}
        title="Удалить из франшизы?"
        description="Фильм будет удалён из франшизы. Сам фильм в каталоге останется."
        confirmLabel="Удалить"
        onConfirm={() => removeKey && removeSlot(removeKey)}
        onClose={() => setRemoveKey(null)}
      />
    </MachinedCard>
  );
}
