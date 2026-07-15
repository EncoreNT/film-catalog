"use client";

import { useMemo, useState } from "react";
import { SegmentedControl } from "@/components/primitives/SegmentedControl";
import { useRouter } from "next/navigation";
import type { FranchiseWithSlots } from "@/lib/franchises/franchise-include";
import { MovieCard } from "@/components/movies/MovieCard";
import { FranchisePlaceholder } from "@/components/franchises/FranchisePlaceholder";
import { MoviePickerDialog } from "@/components/franchises/MoviePickerDialog";
import type { MovieWithTracks } from "@/lib/movies/movie-query";
import { apiFetch } from "@/lib/api/client";

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

  // Stable story-order rank per slot — the chronology badge always shows the
  // slot's place in the franchise's world, regardless of the active sort.
  const storyRank = useMemo(() => {
    const map = new Map<number, number>();
    [...slots]
      .sort((a, b) => a.storyOrder - b.storyOrder)
      .forEach((s, i) => map.set(s.id, i + 1));
    return map;
  }, [slots]);

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
      const payload = sorted.map((slot) => ({
        movieId: slot.id === pickerSlotId ? movie.id : slot.movieId,
        storyOrder: slot.storyOrder,
        titleHint: slot.titleHint,
        yearHint: slot.yearHint,
      }));

      await apiFetch(
        `/api/franchises/${franchiseId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ slots: payload }),
        },
        "Не удалось привязать фильм",
      );
      setPickerSlotId(null);
      router.refresh();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="flex min-h-0 flex-col gap-4 lg:flex-1">
      {/* Pinned section header — does not scroll. Sits on the page background
          (no opaque bar needed) because only the grid below scrolls, so
          nothing rides under it. Aligned to the cover via the same gutter
          the grid uses. */}
      <div className="flex shrink-0 flex-wrap items-end justify-between gap-3 py-1">
        <h2 className="font-display text-xl font-semibold tracking-tight sm:text-2xl">
          Фильмы франшизы
        </h2>
        <SegmentedControl
          value={sortMode}
          onChange={setSortMode}
          fullWidth={false}
          size="compact"
          ariaLabel="Сортировка фильмов"
          options={[
            { value: "story", label: "хронология мира" },
            { value: "year", label: "год выхода" },
          ]}
        />
      </div>

      {/* Only the list scrolls. The wrapper extends into main's horizontal
          padding (-mx) and pads content back (px) so the grid left-edge
          aligns with the hero cover, and card box-shadows paint into the
          gutter instead of being clipped by overflow-y. */}
      <div className="-mx-6 min-h-0 flex-1 px-6 pt-1 lg:-mx-10 lg:overflow-y-auto lg:px-10 lg:pb-10 xl:-mx-14 xl:px-14 2xl:-mx-20 2xl:px-20 3xl:-mx-24 3xl:px-24">
        <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {sorted.map((slot, index) => {
            const rank = storyRank.get(slot.id) ?? index + 1;
            const year = slot.movie?.year ?? slot.yearHint ?? null;
            return (
              <div
                key={slot.id}
                className="flex flex-col gap-2"
                style={{
                  animation: `movieCardIn 0.45s var(--ease) ${
                    Math.min(index, 10) * 45
                  }ms both`,
                }}
              >
                <div className="flex items-center gap-2 px-0.5">
                  <span className="font-mono-tech shrink-0 text-[0.7rem] tabular-nums text-faint">
                    {String(rank).padStart(2, "0")}
                  </span>
                  <span className="h-px flex-1 bg-border" aria-hidden />
                  <span className="font-mono-tech shrink-0 text-[0.7rem] tabular-nums text-muted">
                    {year ?? "—"}
                  </span>
                </div>
                {slot.movie ? (
                  <MovieCard movie={slot.movie as MovieWithTracks} index={index} />
                ) : (
                  <FranchisePlaceholder
                    slotIndex={index}
                    titleHint={slot.titleHint}
                    yearHint={slot.yearHint}
                    onPick={() => setPickerSlotId(slot.id)}
                  />
                )}
              </div>
            );
          })}
        </div>

        {sorted.length === 0 ? (
          <p className="text-center text-sm text-muted">
            Фильмы ещё не добавлены.
          </p>
        ) : null}
      </div>

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
