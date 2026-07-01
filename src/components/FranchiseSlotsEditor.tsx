"use client";

import { useCallback, useState } from "react";
import { Film } from "lucide-react";
import { Button } from "./primitives/Button";
import { ConfirmDialog } from "./primitives/ConfirmDialog";
import { MoviePickerDialog } from "./MoviePickerDialog";
import { FranchiseSlotCard, AddSlotButton } from "./FranchiseSlotCard";
import type { MovieWithTracks } from "@/lib/movie-query";
import type { FranchiseSlotInput } from "@/lib/franchise-slots";
import { movieCoverUrlFromMovie } from "@/lib/cover-url";
import { trimInputOptional } from "@/lib/text-trim";

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
    <section className="surface-card space-y-4 p-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-mono-tech text-faint">хронология мира</p>
          <h2 className="font-display text-xl font-semibold">Фильмы франшизы</h2>
        </div>
        <p className="font-mono-tech text-xs text-muted tabular-nums">
          {filledCount} / {slots.length} во франшизе
        </p>
      </div>

      {slots.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-[var(--radius)] border-2 border-dashed border-border-strong bg-bg-surface/20 px-6 py-10 text-center">
          <span className="flex h-11 w-11 items-center justify-center rounded-full border border-border-strong bg-bg-elevated text-faint">
            <Film className="h-5 w-5" aria-hidden />
          </span>
          <div className="space-y-1">
            <p className="text-sm text-text">Франшиза пока пуста</p>
            <p className="text-xs text-muted">
              Добавьте фильмы и привяжите их из каталога
            </p>
          </div>
          <Button type="button" onClick={addEmptySlot}>
            <span className="text-lg leading-none" aria-hidden>+</span>
            Добавить фильм
          </Button>
        </div>
      ) : (
        <>
          <div className="film-perfs h-2 w-full opacity-40" aria-hidden />
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
    </section>
  );
}
