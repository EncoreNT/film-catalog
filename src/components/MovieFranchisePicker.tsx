"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronDown, Library, Loader2, Plus, Search, X } from "lucide-react";
import { InfoHint } from "./primitives/InfoHint";
import { FranchiseSlotPickerDialog } from "./FranchiseSlotPickerDialog";
import type { MovieFranchiseMembership } from "@/lib/movie-franchise-memberships";
import { trimInput } from "@/lib/text-trim";

interface MovieFranchisePickerProps {
  movieId: number;
  movieTitle: string;
  initialMemberships: MovieFranchiseMembership[];
}

interface FranchiseLite {
  id: number;
  name: string;
  slug: string;
}

type SlotDialogState = {
  mode: "add" | "move";
  franchiseId: number;
  franchiseName: string;
  currentSlotId?: number;
};

const SEARCH_LIMIT = 20;

export function MovieFranchisePicker({
  movieId,
  movieTitle,
  initialMemberships,
}: MovieFranchisePickerProps) {
  const [memberships, setMemberships] = useState(initialMemberships);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<FranchiseLite[]>([]);
  const [searching, setSearching] = useState(false);
  const [creatingName, setCreatingName] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<number | null>(null);
  const [slotDialog, setSlotDialog] = useState<SlotDialogState | null>(null);
  const [error, setError] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const busy = creatingName != null || removingId != null;
  const joinedIds = new Set(memberships.map((m) => m.franchiseId));

  const runSearch = useCallback(async (q: string) => {
    setSearching(true);
    try {
      const res = await fetch(
        `/api/franchises?lite=1&limit=${SEARCH_LIMIT}${q ? `&q=${encodeURIComponent(q)}` : ""}`,
      );
      const data = (await res.json()) as { items?: FranchiseLite[] };
      setResults(data.items ?? []);
    } catch {
      setResults([]);
    } finally {
      setSearching(false);
    }
  }, []);

  const openDropdown = useCallback(() => {
    setOpen(true);
    void runSearch("");
    setTimeout(() => inputRef.current?.focus(), 40);
  }, [runSearch]);

  const closeDropdown = useCallback(() => {
    setOpen(false);
    setQuery("");
    setResults([]);
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        closeDropdown();
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeDropdown();
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, closeDropdown]);

  useEffect(() => () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
  }, []);

  const onQueryChange = (value: string) => {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      void runSearch(value.trim());
    }, 220);
  };

  const pickFranchise = (franchise: FranchiseLite) => {
    setSlotDialog({
      mode: "add",
      franchiseId: franchise.id,
      franchiseName: franchise.name,
    });
    closeDropdown();
  };

  const createFranchise = async (name: string) => {
    setCreatingName(name);
    setError(null);
    try {
      const res = await fetch(`/api/movies/${movieId}/franchises`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = (await res.json()) as
        | MovieFranchiseMembership[]
        | { error?: string };
      if (!res.ok) {
        throw new Error(
          (data as { error?: string }).error ?? "Не удалось создать франшизу",
        );
      }
      setMemberships(data as MovieFranchiseMembership[]);
      closeDropdown();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setCreatingName(null);
    }
  };

  const removeFranchise = async (franchiseId: number) => {
    setRemovingId(franchiseId);
    setError(null);
    try {
      const res = await fetch(
        `/api/movies/${movieId}/franchises/${franchiseId}`,
        { method: "DELETE" },
      );
      const data = (await res.json()) as
        | MovieFranchiseMembership[]
        | { error?: string };
      if (!res.ok) {
        throw new Error(
          (data as { error?: string }).error ?? "Не удалось удалить",
        );
      }
      setMemberships(data as MovieFranchiseMembership[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setRemovingId(null);
    }
  };

  const trimmedQuery = query.trim();
  const canCreate =
    trimmedQuery.length > 0 &&
    !results.some(
      (r) => r.name.toLowerCase() === trimmedQuery.toLowerCase(),
    );

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-1.5">
        <span className="text-sm text-muted">Франшизы</span>
        <InfoHint
          label="Франшизы"
          text="Привяжите фильм к одной или нескольким франшизам и выберите слот, куда он встаёт. Можно вставить перед любым слотом, занять пустой плейсхолдер или добавить в конец. Новая франшиза создаётся прямо отсюда."
        />
      </div>

      <div className="rounded-[var(--radius)] border border-border bg-bg-elevated p-3">
        {memberships.length > 0 ? (
          <ul className="space-y-1.5">
            {memberships.map((m) => {
              const removing = removingId === m.franchiseId;
              return (
                <li
                  key={m.franchiseId}
                  className="flex items-center gap-3 rounded-[var(--radius-sm)] border border-border bg-bg-surface px-3 py-2 transition-colors hover:border-border-strong"
                >
                  <button
                    type="button"
                    onClick={() =>
                      setSlotDialog({
                        mode: "move",
                        franchiseId: m.franchiseId,
                        franchiseName: m.franchiseName,
                        currentSlotId: m.slotId,
                      })
                    }
                    disabled={busy}
                    title="Изменить слот"
                    aria-label={`Изменить слот во франшизе «${m.franchiseName}»`}
                    className="focus-ring flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full border border-accent/30 bg-accent/10 font-mono-tech text-xs font-semibold text-accent transition-all hover:border-accent hover:shadow-[0_0_14px_var(--accent-glow)] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {m.position}
                  </button>
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/franchises/${m.franchiseSlug}`}
                      className="focus-ring block truncate text-sm font-medium text-text transition-colors hover:text-accent"
                    >
                      {m.franchiseName}
                    </Link>
                    <p className="font-mono-tech mt-0.5 text-xs text-faint">
                      слот {m.position} из {m.totalInFranchise}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeFranchise(m.franchiseId)}
                    disabled={busy}
                    aria-label={`Убрать из франшизы «${m.franchiseName}»`}
                    className="focus-ring flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-[var(--radius-sm)] border border-border text-muted transition-colors hover:border-danger/40 hover:text-danger disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {removing ? (
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                    ) : (
                      <X className="h-4 w-4" aria-hidden />
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="px-1 py-2 text-sm text-faint">
            Не входит ни в одну франшизу
          </p>
        )}

        <div className="relative mt-2" ref={containerRef}>
          <button
            type="button"
            onClick={open ? closeDropdown : openDropdown}
            aria-haspopup="listbox"
            aria-expanded={open}
            className={`focus-ring flex min-h-10 w-full cursor-pointer items-center justify-between gap-2 rounded-[var(--radius-sm)] border px-3 text-sm transition-all duration-200 ${
              open
                ? "border-accent/50 bg-bg-surface shadow-[0_0_16px_var(--accent-glow)]"
                : "border-border bg-bg-surface text-muted hover:border-border-strong hover:text-text"
            }`}
          >
            <span className="flex items-center gap-2">
              <Plus className="h-4 w-4 text-accent/80" aria-hidden />
              Добавить франшизу
            </span>
            <ChevronDown
              className={`h-4 w-4 shrink-0 text-accent/70 transition-transform duration-200 ${
                open ? "rotate-180" : ""
              }`}
              aria-hidden
            />
          </button>

          {open ? (
            <div
              role="listbox"
              className="surface-elevated absolute z-50 mt-2 max-h-72 w-full overflow-auto p-1 shadow-2xl"
            >
              <div className="px-1 pb-1 pt-2">
                <div className="relative">
                  <Search
                    className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted/60"
                    aria-hidden
                  />
                  <input
                    ref={inputRef}
                    value={query}
                    onChange={(e) => onQueryChange(e.target.value)}
                    onBlur={() => {
                      const trimmed = trimInput(query);
                      if (trimmed !== query) onQueryChange(trimmed);
                    }}
                    placeholder="Поиск или создание…"
                    className="focus-ring min-h-9 w-full rounded-[var(--radius-sm)] border border-border bg-bg-surface py-1.5 pl-8 pr-3 text-sm text-text placeholder:text-muted/60"
                  />
                  {searching ? (
                    <Loader2
                      className="absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 animate-spin text-accent/70"
                      aria-hidden
                    />
                  ) : null}
                </div>
              </div>

              {results.filter((r) => !joinedIds.has(r.id)).length === 0 &&
              !canCreate ? (
                <p className="px-3 py-2 text-sm text-muted">
                  {trimmedQuery
                    ? "Ничего не найдено"
                    : "Нет доступных франшиз"}
                </p>
              ) : null}

              {results
                .filter((r) => !joinedIds.has(r.id))
                .map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    role="option"
                    aria-selected={false}
                    disabled={busy}
                    onClick={() => pickFranchise(r)}
                    className="flex w-full items-center gap-2 rounded-[var(--radius-sm)] px-3 py-2 text-left text-sm text-text transition-colors hover:bg-bg-surface-hover disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <Library
                      className="h-4 w-4 shrink-0 text-accent/70"
                      aria-hidden
                    />
                    <span className="truncate">{r.name}</span>
                  </button>
                ))}

              {canCreate ? (
                <button
                  type="button"
                  role="option"
                  aria-selected={false}
                  disabled={busy}
                  onClick={() => createFranchise(trimmedQuery)}
                  className="mt-1 flex w-full items-center gap-2 rounded-[var(--radius-sm)] border border-accent/30 bg-accent/10 px-3 py-2 text-left text-sm text-accent transition-colors hover:bg-accent/20 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Plus className="h-4 w-4 shrink-0" aria-hidden />
                  <span className="truncate">Создать «{trimmedQuery}»</span>
                  {creatingName === trimmedQuery ? (
                    <Loader2
                      className="ml-auto h-3.5 w-3.5 shrink-0 animate-spin"
                      aria-hidden
                    />
                  ) : null}
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>

      {error ? (
        <p className="text-xs text-danger" role="alert">
          {error}
        </p>
      ) : null}

      {slotDialog ? (
        <FranchiseSlotPickerDialog
          open
          movieId={movieId}
          movieTitle={movieTitle}
          franchiseId={slotDialog.franchiseId}
          franchiseName={slotDialog.franchiseName}
          mode={slotDialog.mode}
          currentSlotId={slotDialog.currentSlotId}
          onPlaced={(next) => {
            setMemberships(next);
            setSlotDialog(null);
          }}
          onClose={() => setSlotDialog(null)}
        />
      ) : null}
    </div>
  );
}
