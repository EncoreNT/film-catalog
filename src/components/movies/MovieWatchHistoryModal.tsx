"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/primitives/Button";
import { DatePicker } from "@/components/primitives/DatePicker";
import { Modal } from "@/components/primitives/Modal";
import { apiFetch } from "@/lib/api/client";
import {
  sortWatchesByDate,
  type MovieWatchEntry,
} from "@/lib/movies/movie-watch-date";
import { formatDate, formatRelativeDate } from "@/lib/shared/format";
import { parseISODate, toISODate } from "@/lib/shared/calendar";

interface MovieWatchHistoryModalProps {
  open: boolean;
  onClose: () => void;
  movieId: number;
  watches: MovieWatchEntry[];
  onChange: (watches: MovieWatchEntry[]) => void;
}

export function MovieWatchHistoryModal({
  open,
  onClose,
  movieId,
  watches,
  onChange,
}: MovieWatchHistoryModalProps) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<number | null>(null);
  const today = toISODate(new Date());
  const rows = sortWatchesByDate(watches);

  useEffect(() => {
    if (open) return;
    setEditingId(null);
    setDraft("");
    setError(null);
  }, [open]);

  const startEdit = (row: MovieWatchEntry) => {
    setEditingId(row.id);
    setDraft(row.watchedOn);
    setError(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setDraft("");
    setError(null);
  };

  const save = async (row: MovieWatchEntry) => {
    if (!draft || draft === row.watchedOn || pendingId != null) return;
    if (watches.some((item) => item.id !== row.id && item.watchedOn === draft)) {
      setError("В этот день просмотр уже записан");
      return;
    }

    const previous = watches;
    onChange(
      sortWatchesByDate(
        watches.map((item) =>
          item.id === row.id ? { ...item, watchedOn: draft } : item,
        ),
      ),
    );
    setError(null);
    setPendingId(row.id);

    try {
      await apiFetch(
        `/api/movies/${movieId}/watches/${row.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ watchedOn: draft }),
        },
        "Не удалось изменить дату просмотра",
      );
      setEditingId(null);
      setDraft("");
      router.refresh();
    } catch (err) {
      onChange(previous);
      setError(
        err instanceof Error ? err.message : "Не удалось изменить дату просмотра",
      );
    } finally {
      setPendingId(null);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="История просмотров"
    >
      {rows.length === 0 ? (
        <p className="font-mono-tech text-faint">просмотров нет</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {rows.map((row) => {
            const relative = formatRelativeDate(parseISODate(row.watchedOn));
            const editing = editingId === row.id;
            return (
              <li
                key={row.id}
                className="border-b border-border/60 pb-3 last:border-b-0 last:pb-0"
              >
                {editing ? (
                  <div className="flex flex-col gap-3 pb-96">
                    <DatePicker
                      label="Дата просмотра"
                      value={draft}
                      max={today}
                      allowClear={false}
                      onChange={setDraft}
                      error={error ?? undefined}
                    />
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="primary"
                        loading={pendingId === row.id}
                        disabled={!draft || draft === row.watchedOn}
                        onClick={() => save(row)}
                      >
                        Сохранить
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        disabled={pendingId === row.id}
                        onClick={cancelEdit}
                      >
                        Отмена
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex flex-col gap-1">
                      <span className="font-mono text-lg font-medium tracking-wide text-text">
                        {formatDate(row.watchedOn)}
                      </span>
                      {relative ? (
                        <span className="font-mono-tech text-accent/80">
                          {relative}
                        </span>
                      ) : null}
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      className="shrink-0"
                      onClick={() => startEdit(row)}
                    >
                      Изменить
                    </Button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </Modal>
  );
}
