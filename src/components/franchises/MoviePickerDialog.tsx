"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Film, Loader2, Search, X } from "lucide-react";
import type { MovieWithTracks } from "@/lib/movies/movie-query";
import { movieCoverUrlFromMovie } from "@/lib/covers/cover-url";
import { Button } from "@/components/primitives/Button";
import { trimInput } from "@/lib/shared/text-trim";
import { pickPrimaryRelease } from "@/lib/releases/release-primary";

interface MoviePickerDialogProps {
  open: boolean;
  onClose: () => void;
  onPick: (movie: MovieWithTracks) => void;
  /** Movie ids already used in this franchise — hidden from results. */
  excludeIds?: number[];
  /** Optional label shown in the header, e.g. "Фильм 3". */
  slotLabel?: string;
  /** While the parent persists the picked movie, show a saving overlay. */
  saving?: boolean;
}

const PAGE_SIZE = 12;

export function MoviePickerDialog(props: MoviePickerDialogProps) {
  if (!props.open) return null;
  return <MoviePickerDialogContent key={props.slotLabel ?? "picker"} {...props} />;
}

function MoviePickerDialogContent({
  onClose,
  onPick,
  excludeIds = [],
  saving = false,
  slotLabel,
}: MoviePickerDialogProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<MovieWithTracks[]>([]);
  const [loading, setLoading] = useState(true);
  const [touched, setTouched] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const excludeSet = new Set(excludeIds);

  const runSearch = useCallback(async (q: string) => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/movies?q=${encodeURIComponent(q)}&status=CATALOG&limit=${PAGE_SIZE}`,
      );
      const data = (await res.json()) as { movies: MovieWithTracks[] };
      setResults(data.movies ?? []);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (!dialog.open) dialog.showModal();
    const onCancel = (e: Event) => {
      e.preventDefault();
      onClose();
    };
    dialog.addEventListener("cancel", onCancel);
    const t = setTimeout(() => inputRef.current?.focus(), 60);
    return () => {
      dialog.removeEventListener("cancel", onCancel);
      clearTimeout(t);
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [onClose]);

  // initial catalog sample shown on first open — state updates only land
  // after the awaited fetch, so no synchronous setState in the effect body.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch(
          `/api/movies?q=&status=CATALOG&limit=${PAGE_SIZE}`,
        );
        const data = (await res.json()) as { movies: MovieWithTracks[] };
        if (!cancelled) setResults(data.movies ?? []);
      } catch {
        if (!cancelled) setResults([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const onQueryChange = (value: string) => {
    setQuery(value);
    setTouched(true);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      void runSearch(value);
    }, 250);
  };

  const visible = results.filter((m) => !excludeSet.has(m.id));

  return (
    <dialog
      ref={dialogRef}
      className="fixed inset-0 z-[120] m-auto flex w-[min(100%-2rem,720px)] max-h-[88dvh] flex-col overflow-hidden rounded-[var(--radius)] border border-border bg-bg-elevated p-0 text-text backdrop:bg-black/60 backdrop:backdrop-blur-sm open:animate-in"
      onClose={onClose}
      aria-label={slotLabel ? `Привязка фильма · ${slotLabel}` : "Привязка фильма"}
    >
      <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
        <div className="min-w-0">
          <p className="font-mono-tech text-accent">
            {slotLabel ?? "привязка фильма"}
          </p>
          <h2 className="font-display text-xl font-semibold">Выбор из каталога</h2>
        </div>
        <Button
          variant="ghost"
          onClick={onClose}
          aria-label="Закрыть"
          className="!min-h-11 !w-11 !p-0"
        >
          <X className="h-5 w-5" />
        </Button>
      </div>

      <div className="border-b border-border px-5 py-3">
        <div className="focus-ring flex items-center gap-2 rounded-[var(--radius)] border border-border bg-bg-surface px-3">
          <Search className="h-4 w-4 shrink-0 text-muted" aria-hidden />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            onBlur={() => {
              const trimmed = trimInput(query);
              if (trimmed !== query) onQueryChange(trimmed);
            }}
            placeholder="Поиск по названию…"
            className="min-h-11 w-full bg-transparent text-sm text-text outline-none placeholder:text-muted/60"
            aria-label="Поиск фильма"
          />
          {loading ? (
            <Loader2 className="h-4 w-4 shrink-0 animate-spin text-accent" aria-hidden />
          ) : null}
        </div>
      </div>

      <div className="relative min-h-0 flex-1 overflow-y-auto p-3">
        {visible.length > 0 ? (
          <ul className="grid gap-2 sm:grid-cols-2">
            {visible.map((movie) => {
              const cover = movieCoverUrlFromMovie(movie);
              return (
                <li key={movie.id}>
                  <button
                    type="button"
                    onClick={() => onPick(movie)}
                    disabled={saving}
                    className="focus-ring group flex w-full cursor-pointer items-center gap-3 rounded-[var(--radius-sm)] border border-border bg-bg-surface p-2.5 text-left transition-all duration-200 hover:border-accent/50 hover:bg-bg-surface-hover hover:shadow-[0_0_18px_var(--accent-glow)] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <span className="relative h-16 w-11 shrink-0 overflow-hidden rounded-[var(--radius-sm)] border border-border bg-bg-deep">
                      {cover ? (
                        <Image
                          src={cover}
                          alt=""
                          fill
                          unoptimized
                          sizes="44px"
                          className="object-cover"
                        />
                      ) : (
                        <span className="flex h-full items-center justify-center text-faint">
                          <Film className="h-4 w-4" aria-hidden />
                        </span>
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-text">
                        {movie.title}
                      </span>
                      <span className="font-mono-tech mt-0.5 block text-xs text-muted">
                        {movie.year ?? "—"}
                        {(() => {
                          const duration =
                            pickPrimaryRelease(movie.releases)?.durationSeconds;
                          return duration
                            ? ` · ${Math.round(duration / 60)} мин`
                            : "";
                        })()}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
            {touched && query ? (
              <>
                <Search className="h-8 w-8 text-faint" aria-hidden />
                <p className="text-sm text-muted">
                  Ничего не найдено по запросу «{query}»
                </p>
              </>
            ) : (
              <>
                <Film className="h-8 w-8 text-faint" aria-hidden />
                <p className="text-sm text-muted">
                  Начните вводить название фильма из каталога
                </p>
              </>
            )}
          </div>
        )}

        {saving ? (
          <div
            className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-bg-elevated/80 backdrop-blur-sm"
            role="status"
            aria-live="polite"
          >
            <Loader2 className="h-7 w-7 animate-spin text-accent" aria-hidden />
            <p className="font-mono-tech text-xs text-muted">привязываем фильм…</p>
          </div>
        ) : null}
      </div>
    </dialog>
  );
}
