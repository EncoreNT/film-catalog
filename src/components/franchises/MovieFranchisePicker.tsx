"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronDown, Library, Loader2, Plus, X } from "lucide-react";
import { CreatableCombobox } from "@/components/primitives/CreatableCombobox";
import { InfoHint } from "@/components/primitives/InfoHint";
import { FranchiseSlotPickerDialog } from "@/components/franchises/FranchiseSlotPickerDialog";
import type { MovieFranchiseMembership } from "@/lib/movies/movie-franchise-memberships";
import { searchTextEquals } from "@/lib/shared/search-text";
import { apiFetch } from "@/lib/api/client";
import { useDebouncedApiSearch } from "@/hooks/useDebouncedApiSearch";

interface MovieFranchisePickerProps {
  movieId: number;
  movieTitle: string;
  initialMemberships: MovieFranchiseMembership[];
  /** Hide section title — when wrapped in an external card header. */
  embedded?: boolean;
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
  embedded = false,
}: MovieFranchisePickerProps) {
  const [memberships, setMemberships] = useState(initialMemberships);
  const [open, setOpen] = useState(false);
  const [creatingName, setCreatingName] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<number | null>(null);
  const [slotDialog, setSlotDialog] = useState<SlotDialogState | null>(null);
  const [error, setError] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const buildUrl = useCallback(
    (q: string) =>
      `/api/franchises?lite=1&limit=${SEARCH_LIMIT}${q ? `&q=${encodeURIComponent(q)}` : ""}`,
    [],
  );

  const {
    query,
    setQuery,
    results,
    loading: searching,
    onQueryChange,
    runSearch,
  } = useDebouncedApiSearch<FranchiseLite>({
    buildUrl,
    enabled: open,
    debounceMs: 220,
  });

  const busy = creatingName != null || removingId != null;
  const joinedIds = new Set(memberships.map((m) => m.franchiseId));

  const openDropdown = useCallback(() => {
    setOpen(true);
    setTimeout(() => inputRef.current?.focus(), 40);
  }, []);

  const closeDropdown = useCallback(() => {
    setOpen(false);
    setQuery("");
    void runSearch("");
  }, [runSearch, setQuery]);

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
      const data = await apiFetch<MovieFranchiseMembership[]>(
        `/api/movies/${movieId}/franchises`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name }),
        },
        "Не удалось создать франшизу",
      );
      setMemberships(data);
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
      const data = await apiFetch<MovieFranchiseMembership[]>(
        `/api/movies/${movieId}/franchises/${franchiseId}`,
        { method: "DELETE" },
        "Не удалось удалить",
      );
      setMemberships(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setRemovingId(null);
    }
  };

  const trimmedQuery = query.trim();
  const canCreate =
    trimmedQuery.length > 0 &&
    !results.some((r) => searchTextEquals(r.name, trimmedQuery));

  return (
    <div className="flex flex-col gap-2">
      {!embedded ? (
        <div className="flex items-center gap-1.5">
          <span className="text-sm text-muted">Франшизы</span>
          <InfoHint
            label="Франшизы"
            text="Привяжите фильм к одной или нескольким франшизам и выберите слот, куда он встаёт. Можно вставить перед любым слотом, занять пустой плейсхолдер или добавить в конец. Новая франшиза создаётся прямо отсюда."
          />
        </div>
      ) : null}

      <div
        className={
          embedded
            ? "space-y-3"
            : "rounded-[var(--radius)] border border-border bg-bg-elevated p-3"
        }
      >
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
            <CreatableCombobox
              open
              query={query}
              onQueryChange={onQueryChange}
              loading={searching}
              disabled={busy}
              items={results
                .filter((r) => !joinedIds.has(r.id))
                .map((r) => ({
                  id: r.id,
                  label: r.name,
                }))}
              onSelect={(item) => {
                const franchise = results.find((r) => r.id === item.id);
                if (franchise) pickFranchise(franchise);
              }}
              canCreate={canCreate}
              creating={creatingName === trimmedQuery}
              onCreate={createFranchise}
              emptyMessage={
                trimmedQuery ? "Ничего не найдено" : "Нет доступных франшиз"
              }
              itemIcon={
                <Library
                  className="h-4 w-4 shrink-0 text-accent/70"
                  aria-hidden
                />
              }
              createIcon={<Plus className="h-4 w-4 shrink-0" aria-hidden />}
              inputRef={inputRef}
              className="surface-elevated absolute z-50 mt-2 max-h-72 w-full overflow-auto p-1 shadow-2xl"
              searchInputClassName="focus-ring min-h-9 w-full rounded-[var(--radius-sm)] border border-border bg-bg-surface py-1.5 pl-8 pr-3 text-sm text-text placeholder:text-muted/60"
            />
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
