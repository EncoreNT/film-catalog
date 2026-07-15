"use client";

import { useEffect, useState } from "react";
import { Film, Library, Loader2, Plus, X } from "lucide-react";
import { Button } from "@/components/primitives/Button";
import { NativeDialog } from "@/components/primitives/NativeDialog";
import { apiFetch } from "@/lib/api/client";
import type { MovieFranchiseMembership } from "@/lib/movies/movie-franchise-memberships";

interface FranchiseSlotRow {
  id: number;
  storyOrder: number;
  movieId: number | null;
  titleHint: string | null;
  yearHint: number | null;
  movie: { id: number; title: string; year: number | null; slug: string } | null;
}

type Target =
  | { kind: "end" }
  | { kind: "before"; slotId: number }
  | { kind: "fill"; slotId: number };

interface FranchiseSlotPickerDialogProps {
  open: boolean;
  onClose: () => void;
  movieId: number;
  movieTitle: string;
  franchiseId: number;
  franchiseName: string;
  mode: "add" | "move";
  currentSlotId?: number;
  onPlaced: (memberships: MovieFranchiseMembership[]) => void;
}

const DIALOG_CLASS =
  "fixed inset-0 m-auto flex max-h-[88dvh] w-[min(100%-2rem,560px)] flex-col overflow-hidden rounded-[var(--radius)] border border-border bg-bg-elevated p-0 text-text backdrop:bg-black/60 backdrop:backdrop-blur-sm open:animate-in";

export function FranchiseSlotPickerDialog(props: FranchiseSlotPickerDialogProps) {
  if (!props.open) return null;
  return (
    <FranchiseSlotPickerDialogContent
      key={`${props.franchiseId}:${props.mode}`}
      {...props}
    />
  );
}

function FranchiseSlotPickerDialogContent({
  open,
  onClose,
  onPlaced,
  movieId,
  movieTitle,
  franchiseId,
  franchiseName,
  mode,
  currentSlotId,
}: FranchiseSlotPickerDialogProps) {
  const [slots, setSlots] = useState<FranchiseSlotRow[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [placing, setPlacing] = useState<Target | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await apiFetch<FranchiseSlotRow[]>(
          `/api/franchises/${franchiseId}/slots`,
          undefined,
          "Не удалось загрузить слоты франшизы",
        );
        if (!cancelled) setSlots(data);
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Не удалось загрузить слоты франшизы",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [franchiseId]);

  const currentIdx =
    slots && currentSlotId != null
      ? slots.findIndex((s) => s.id === currentSlotId)
      : -1;

  const place = async (target: Target) => {
    setPlacing(target);
    setError(null);
    try {
      const url =
        mode === "move"
          ? `/api/movies/${movieId}/franchises/${franchiseId}`
          : `/api/movies/${movieId}/franchises`;
      const data = await apiFetch<MovieFranchiseMembership[]>(
        url,
        {
          method: mode === "move" ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ franchiseId, target }),
        },
        "Не удалось разместить фильм",
      );
      onPlaced(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setPlacing(null);
    }
  };

  const pointAfterDisabled = (i: number) =>
    currentIdx >= 0 && (i === currentIdx || i === currentIdx - 1);

  const title =
    mode === "move"
      ? "Переместить фильм в франшизе"
      : "Добавить фильм во франшизу";

  return (
    <NativeDialog
      open={open}
      onClose={onClose}
      preventCancel={placing != null}
      zIndex={120}
      ariaLabel={`${title}: ${franchiseName}`}
      className={DIALOG_CLASS}
    >
      <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
        <div className="min-w-0">
          <p className="font-mono-tech text-accent">{title}</p>
          <h2 className="font-display truncate text-xl font-semibold">
            {franchiseName}
          </h2>
          <p className="mt-1 truncate text-sm text-muted">
            Фильм: <span className="text-text">{movieTitle}</span>
          </p>
        </div>
        <Button
          variant="ghost"
          onClick={onClose}
          disabled={placing != null}
          aria-label="Закрыть"
          className="!min-h-11 !w-11 !p-0"
        >
          <X className="h-5 w-5" />
        </Button>
      </div>

      <div className="relative min-h-0 flex-1 overflow-y-auto p-4">
        {loading ? (
          <div className="flex items-center justify-center gap-3 py-16 text-muted">
            <Loader2 className="h-5 w-5 animate-spin text-accent" aria-hidden />
            <span className="font-mono-tech text-sm">загрузка слотов…</span>
          </div>
        ) : slots == null ? (
          <p className="py-16 text-center text-sm text-muted">{error}</p>
        ) : slots.length === 0 ? (
          <div className="flex flex-col items-center gap-4 px-6 py-14 text-center">
            <Library className="h-8 w-8 text-faint" aria-hidden />
            <p className="text-sm text-muted">
              Франшиза пуста — фильм станет первым слотом
            </p>
            <Button
              variant="primary"
              loading={placing?.kind === "end"}
              disabled={placing != null}
              onClick={() => place({ kind: "end" })}
            >
              Добавить
            </Button>
          </div>
        ) : (
          <ol className="space-y-0.5">
            <InsertionPoint
              label="в начало"
              disabled={placing != null || currentIdx === 0}
              active={
                placing != null &&
                placing.kind === "before" &&
                placing.slotId === slots[0].id
              }
              onClick={() => place({ kind: "before", slotId: slots[0].id })}
            />
            {slots.map((slot, i) => {
              const isOwn = slot.id === currentSlotId;
              const next = slots[i + 1];
              return (
                <li key={slot.id}>
                  <SlotRow
                    slot={slot}
                    index={i}
                    isOwn={isOwn}
                    placing={placing}
                    onFill={() => place({ kind: "fill", slotId: slot.id })}
                  />
                  <InsertionPoint
                    label={next ? "вставить сюда" : "в конец"}
                    disabled={placing != null || pointAfterDisabled(i)}
                    active={
                      placing != null &&
                      ((next != null &&
                        placing.kind === "before" &&
                        placing.slotId === next.id) ||
                        (next == null && placing.kind === "end"))
                    }
                    onClick={() =>
                      next
                        ? place({ kind: "before", slotId: next.id })
                        : place({ kind: "end" })
                    }
                  />
                </li>
              );
            })}
          </ol>
        )}

        {error && !loading && slots != null ? (
          <p className="mt-3 text-sm text-danger" role="alert">
            {error}
          </p>
        ) : null}

        {placing ? (
          <div
            className="absolute inset-0 flex items-center justify-center gap-3 bg-bg-elevated/80 backdrop-blur-sm"
            role="status"
            aria-live="polite"
          >
            <Loader2 className="h-6 w-6 animate-spin text-accent" aria-hidden />
            <span className="font-mono-tech text-sm text-muted">
              размещаем фильм…
            </span>
          </div>
        ) : null}
      </div>
    </NativeDialog>
  );
}

function SlotRow({
  slot,
  index,
  isOwn,
  placing,
  onFill,
}: {
  slot: FranchiseSlotRow;
  index: number;
  isOwn: boolean;
  placing: Target | null;
  onFill: () => void;
}) {
  const empty = slot.movieId == null;
  const fillBusy = placing?.kind === "fill" && placing.slotId === slot.id;

  return (
    <div
      className={`flex items-center gap-3 rounded-[var(--radius-sm)] border px-3 py-2.5 ${
        isOwn
          ? "border-accent/50 bg-accent/10"
          : empty
            ? "border-dashed border-border bg-bg-surface/40"
            : "border-border bg-bg-surface"
      }`}
    >
      <span
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-border font-mono-tech text-xs text-muted"
        aria-hidden
      >
        {index + 1}
      </span>
      <div className="min-w-0 flex-1">
        {slot.movie ? (
          <>
            <span className="block truncate text-sm font-medium text-text">
              {slot.movie.title}
            </span>
            <span className="font-mono-tech mt-0.5 block text-xs text-faint">
              {slot.movie.year ?? "—"}
              {isOwn ? " · этот фильм" : ""}
            </span>
          </>
        ) : (
          <>
            <span className="block truncate text-sm text-muted">
              {slot.titleHint ?? "пусто"}
            </span>
            <span className="font-mono-tech mt-0.5 block text-xs text-faint">
              {slot.yearHint ? String(slot.yearHint) : "свободный слот"}
            </span>
          </>
        )}
      </div>
      {empty && !isOwn ? (
        <Button
          type="button"
          variant="secondary"
          loading={fillBusy}
          disabled={placing != null}
          onClick={onFill}
          className="!min-h-9"
        >
          Занять
        </Button>
      ) : null}
      {slot.movie && !isOwn ? (
        <Film className="h-4 w-4 shrink-0 text-faint" aria-hidden />
      ) : null}
    </div>
  );
}

function InsertionPoint({
  label,
  disabled,
  active,
  onClick,
}: {
  label: string;
  disabled: boolean;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <div className="py-1">
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className={`focus-ring group flex h-7 w-full items-center gap-2 rounded-[var(--radius-sm)] text-xs transition-colors disabled:cursor-not-allowed disabled:opacity-30 ${
          active ? "text-accent" : "text-muted hover:text-accent"
        }`}
      >
        <span
          className={`h-px flex-1 transition-colors ${
            active ? "bg-accent/60" : "bg-border group-hover:bg-accent/50"
          }`}
          aria-hidden
        />
        <span className="flex items-center gap-1 font-mono-tech">
          <Plus className="h-3 w-3" aria-hidden />
          {label}
        </span>
        <span
          className={`h-px flex-1 transition-colors ${
            active ? "bg-accent/60" : "bg-border group-hover:bg-accent/50"
          }`}
          aria-hidden
        />
      </button>
    </div>
  );
}
