"use client";

import { useMemo, useState } from "react";
import { ArrowUpDown } from "lucide-react";
import { useRouter } from "next/navigation";
import type { FranchiseWithSlots } from "@/lib/franchises/franchise-include";
import { MovieCard } from "@/components/movies/MovieCard";
import { FranchisePlaceholder } from "@/components/franchises/FranchisePlaceholder";
import { MoviePickerDialog } from "@/components/franchises/MoviePickerDialog";
import type { MovieWithTracks } from "@/lib/movies/movie-query";

type SortMode = "story" | "year";

interface FranchiseSlotsViewProps {
  franchiseId: number;
  slots: FranchiseWithSlots["slots"];
}

export function FranchiseSlotsView({ franchiseId, slots }: FranchiseSlotsViewProps) {
  const router = useRouter();
  const [sortMode, setSortMode] = useState<SortMode>("story");
  const [pickerSlotId, setPickerSlotId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const sorted = useMemo(() => {
    const copy = [...slots];
    if (sortMode === "story") {
      copy.sort((a, b) => a.storyOrder - b.storyOrder);
    } else {
      copy.sort((a, b) => {
        const yearA = a.movie?.year ?? a.yearHint ?? 9999;
        const yearB = b.movie?.year ?? b.yearHint ?? 9999;
        return yearA - yearB;
      });
    }
    return copy;
  }, [slots, sortMode]);

  const pickerSlotIndex = pickerSlotId
    ? sorted.findIndex((s) => s.id === pickerSlotId)
    : -1;

  // Ids of movies already linked elsewhere in this franchise — hidden from picker
  const excludeIds = sorted
    .filter((s) => s.movieId != null && s.id !== pickerSlotId)
    .map((s) => s.movieId as number);

  const pickMovie = async (movie: MovieWithTracks) => {
    if (pickerSlotId == null) return;
    setSaving(true);
    try {
      // Rebuild the full slot set with the chosen movie linked to this slot.
      const payload = sorted.map((slot) => ({
        movieId: slot.id === pickerSlotId ? movie.id : slot.movieId,
        storyOrder: slot.storyOrder,
        titleHint: slot.titleHint,
        yearHint: slot.yearHint,
      }));

      const res = await fetch(`/api/franchises/${franchiseId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slots: payload }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "Не удалось привязать фильм");
      }
      setPickerSlotId(null);
      router.refresh();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-mono-tech text-muted">фильмы франшизы</h2>
        <div
          className="inline-flex rounded-[var(--radius-sm)] border border-border bg-bg-elevated p-0.5"
          role="group"
          aria-label="Сортировка фильмов"
        >
          <button
            type="button"
            onClick={() => setSortMode("story")}
            aria-pressed={sortMode === "story"}
            className={`focus-ring rounded-[6px] px-3 py-1.5 text-xs transition-colors ${
              sortMode === "story"
                ? "bg-accent/15 text-accent"
                : "text-muted hover:text-text"
            }`}
          >
            хронология мира
          </button>
          <button
            type="button"
            onClick={() => setSortMode("year")}
            aria-pressed={sortMode === "year"}
            className={`focus-ring rounded-[6px] px-3 py-1.5 text-xs transition-colors ${
              sortMode === "year"
                ? "bg-accent/15 text-accent"
                : "text-muted hover:text-text"
            }`}
          >
            год выхода
          </button>
        </div>
      </div>

      <div className="film-perfs mb-2 h-3 w-full opacity-40" aria-hidden />

      <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
        {sorted.map((slot, index) =>
          slot.movie ? (
            <MovieCard
              key={slot.id}
              movie={slot.movie as MovieWithTracks}
              index={index}
            />
          ) : (
            <FranchisePlaceholder
              key={slot.id}
              slotIndex={index}
              titleHint={slot.titleHint}
              yearHint={slot.yearHint}
              onPick={() => setPickerSlotId(slot.id)}
            />
          ),
        )}
      </div>

      {sorted.length === 0 ? (
        <p className="text-center text-sm text-muted">
          Фильмы ещё не добавлены.{" "}
          <ArrowUpDown className="inline h-3.5 w-3.5" aria-hidden />
        </p>
      ) : null}

      <MoviePickerDialog
        open={pickerSlotId != null}
        onClose={() => setPickerSlotId(null)}
        onPick={pickMovie}
        excludeIds={excludeIds}
        saving={saving}
        slotLabel={
          pickerSlotIndex >= 0
            ? sorted[pickerSlotIndex].titleHint ?? `Фильм ${pickerSlotIndex + 1}`
            : undefined
        }
      />
    </section>
  );
}
