"use client";

import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { useRouter } from "next/navigation";
import { CalendarPlus, Check, ChevronRight, History, Trash2 } from "lucide-react";
import { Button } from "@/components/primitives/Button";
import { DatePicker } from "@/components/primitives/DatePicker";
import { Modal } from "@/components/primitives/Modal";
import { apiFetch } from "@/lib/api/client";
import { formatWatchCount, sortWatchesByDate, type MovieWatchEntry } from "@/lib/movies/movie-watch-date";
import { formatDate, formatRelativeDate } from "@/lib/shared/format";
import { parseISODate, toISODate } from "@/lib/shared/calendar";

interface MovieWatchHistoryModalProps {
  open: boolean;
  initialMode: "add" | "history";
  onClose: () => void;
  movieId: number;
  watches: MovieWatchEntry[];
  onChange: Dispatch<SetStateAction<MovieWatchEntry[]>>;
}

export function MovieWatchHistoryModal({ open, initialMode, onClose, movieId, watches, onChange }: MovieWatchHistoryModalProps) {
  const router = useRouter();
  const rows = sortWatchesByDate(watches);
  const today = toISODate(new Date());
  const initialRow = initialMode === "history" ? rows[0] : undefined;
  const [editingId, setEditingId] = useState<number | null>(initialRow?.id ?? null);
  const [draft, setDraft] = useState(initialRow?.watchedOn ?? today);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const [pending, setPending] = useState(false);
  const busyRef = useRef(false);
  const editorRef = useRef<HTMLHeadingElement>(null);
  const cancelDeleteRef = useRef<HTMLButtonElement>(null);
  const selected = rows.find((row) => row.id === editingId);
  const duplicate = rows.some((row) => row.id !== editingId && row.watchedOn === draft);

  useEffect(() => {
    if (confirmDelete) cancelDeleteRef.current?.focus();
  }, [confirmDelete]);

  const select = (row?: MovieWatchEntry) => {
    if (busyRef.current) return;
    setEditingId(row?.id ?? null);
    setDraft(row?.watchedOn ?? today);
    setConfirmDelete(false);
    setError(null);
    setNotice("");
    editorRef.current?.focus({ preventScroll: true });
  };

  const close = () => {
    if (!busyRef.current) onClose();
  };

  const save = async () => {
    if (busyRef.current || duplicate || !draft || draft > today || draft === selected?.watchedOn) return;
    busyRef.current = true;
    setPending(true);
    setError(null);
    setNotice("");
    try {
      const result = await apiFetch<MovieWatchEntry>(
        `/api/movies/${movieId}/watches${editingId == null ? "" : `/${editingId}`}`,
        {
          method: editingId == null ? "POST" : "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ watchedOn: draft }),
        },
        "Не удалось сохранить просмотр. Попробуйте ещё раз.",
      );
      onChange((current) => sortWatchesByDate([
        ...current.filter((row) => row.id !== result.id),
        { id: result.id, watchedOn: result.watchedOn },
      ]));
      setEditingId(result.id);
      setNotice(editingId == null ? "Просмотр добавлен" : "Дата сохранена");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось сохранить просмотр");
    } finally {
      busyRef.current = false;
      setPending(false);
    }
  };

  const remove = async () => {
    if (!selected || !confirmDelete || busyRef.current) return;
    busyRef.current = true;
    setPending(true);
    setError(null);
    setNotice("");
    try {
      await apiFetch(`/api/movies/${movieId}/watches/${selected.id}`, { method: "DELETE" },
        "Не удалось удалить просмотр. Попробуйте ещё раз.");
      onChange((current) => current.filter((row) => row.id !== selected.id));
      const next = rows.find((row) => row.id !== selected.id);
      setEditingId(next?.id ?? null);
      setDraft(next?.watchedOn ?? today);
      setConfirmDelete(false);
      setNotice(`Просмотр за ${formatDate(selected.watchedOn)} удалён`);
      editorRef.current?.focus({ preventScroll: true });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось удалить просмотр");
    } finally {
      busyRef.current = false;
      setPending(false);
    }
  };

  return (
    <Modal open={open} onClose={close} title="История просмотров"
      preventCancel={pending} bodyClassName="movie-history-body">
      <div className="movie-history-layout">
        <aside className="movie-history-list" aria-label="Записи просмотров">
          <div className="movie-history-list-heading">
            <span>{formatWatchCount(rows.length)}</span>
            <History size={16} aria-hidden />
          </div>
          <button type="button" className="movie-history-new focus-ring" aria-pressed={editingId == null}
            disabled={pending} onClick={() => select()}>
            <CalendarPlus size={17} aria-hidden /> Добавить просмотр
          </button>
          {rows.length === 0 ? (
            <p className="movie-history-empty">Здесь появятся даты ваших просмотров. Выберите день и добавьте первый просмотр.</p>
          ) : (
            <ul className="movie-history-entries scroll-subtle">
              {rows.map((row) => (
                <li key={row.id}>
                  <button type="button" className="movie-history-entry focus-ring"
                    aria-current={editingId === row.id ? "true" : undefined}
                    aria-label={`Просмотр ${formatDate(row.watchedOn)}, изменить дату`}
                    disabled={pending} onClick={() => select(row)}>
                    <span><time dateTime={row.watchedOn}>{formatDate(row.watchedOn)}</time>
                      <small>{formatRelativeDate(parseISODate(row.watchedOn))}</small></span>
                    <ChevronRight size={15} aria-hidden />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </aside>
        <form className="movie-history-editor" onSubmit={(event) => { event.preventDefault(); if (!confirmDelete) void save(); }}>
          <h3 ref={editorRef} tabIndex={-1} className="movie-history-editor-heading">
            {editingId == null ? "Новый просмотр" : "Изменить дату"}
          </h3>
          <fieldset disabled={pending || confirmDelete} className="min-w-0">
            <DatePicker key={editingId ?? "new"} label="Дата просмотра" value={draft} max={today} allowClear={false} inline
              onChange={(date) => {
                if (busyRef.current || confirmDelete) return;
                setDraft(date); setError(null); setNotice("");
              }} />
          </fieldset>
          <div className="movie-history-editor-footer">
            {confirmDelete && selected ? (
              <>
                <p className="movie-history-confirm" data-error={!!error} role="alert">
                  {error ?? <>Удалить просмотр за <strong>{formatDate(selected.watchedOn)}</strong>?</>}
                </p>
                <div className="movie-history-actions">
                  <Button key="cancel-delete" ref={cancelDeleteRef} type="button" variant="ghost" disabled={pending}
                    onClick={() => { setConfirmDelete(false); setError(null); editorRef.current?.focus(); }}>Отмена</Button>
                  <Button key="confirm-delete" type="button" variant="danger" loading={pending} onClick={() => void remove()}>Удалить просмотр</Button>
                </div>
              </>
            ) : (
              <>
                <div className="movie-history-feedback" data-error={!!error} role={error ? "alert" : "status"}>
                  {error ?? (duplicate ? "В этот день просмотр уже записан" : notice ? <><Check size={15} aria-hidden />{notice}</> : null)}
                </div>
                <div className="movie-history-actions">
                  {selected && (
                    <Button key="request-delete" type="button" variant="ghost" className="movie-history-delete" disabled={pending}
                      onClick={() => { setConfirmDelete(true); setError(null); setNotice(""); }}>
                      <Trash2 size={15} aria-hidden /> Удалить
                    </Button>
                  )}
                  <Button key="save-watch" type="submit" variant="primary" loading={pending}
                    disabled={!draft || draft > today || duplicate || draft === selected?.watchedOn}>
                    {editingId == null ? "Добавить просмотр" : "Сохранить дату"}
                  </Button>
                </div>
              </>
            )}
          </div>
        </form>
      </div>
    </Modal>
  );
}
