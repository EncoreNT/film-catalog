"use client";

import { useState, useTransition, type Dispatch, type SetStateAction } from "react";
import { ArrowDown, ArrowUp, GripVertical, Plus, Trash2 } from "lucide-react";
import { SettingsSection } from "./SettingsSection";
import { Field } from "@/components/primitives/Field";
import { Button } from "@/components/primitives/Button";
import { ConfirmDialog } from "@/components/primitives/ConfirmDialog";
import type { RaterView } from "@/components/settings/SettingsPageClient";
import { apiFetch } from "@/lib/api/client";

interface RatersSectionProps {
  raters: RaterView[];
  onRatersChange: Dispatch<SetStateAction<RaterView[]>>;
}

function draftNamesFromRaters(raters: RaterView[]): Record<number, string> {
  return Object.fromEntries(raters.map((rater) => [rater.id, rater.name]));
}

export function RatersSection({ raters, onRatersChange }: RatersSectionProps) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [dragId, setDragId] = useState<number | null>(null);
  const [draftNames, setDraftNames] = useState<Record<number, string>>(() =>
    draftNamesFromRaters(raters),
  );

  const savedNameFor = (id: number) =>
    raters.find((rater) => rater.id === id)?.name ?? "";

  const handleRename = (id: number, name: string) => {
    const trimmed = name.trim();
    if (!trimmed) {
      setDraftNames((current) => ({ ...current, [id]: savedNameFor(id) }));
      return;
    }
    if (trimmed === savedNameFor(id)) return;

    startTransition(async () => {
      setError(null);
      try {
        const updated = await apiFetch<RaterView>(
          `/api/raters/${id}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: trimmed }),
          },
          "Не удалось переименовать оценщика",
        );
        onRatersChange((prev) =>
          prev.map((rater) =>
            rater.id === id ? { ...rater, name: updated.name } : rater,
          ),
        );
        setDraftNames((current) => ({ ...current, [id]: updated.name }));
      } catch (err) {
        setDraftNames((current) => ({ ...current, [id]: savedNameFor(id) }));
        setError(err instanceof Error ? err.message : "Не удалось переименовать оценщика");
      }
    });
  };

  const handleAdd = () => {
    const name = newName.trim();
    if (!name) return;
    startTransition(async () => {
      setError(null);
      try {
        const created = await apiFetch<RaterView>(
          "/api/raters",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name }),
          },
          "Не удалось добавить оценщика",
        );
        onRatersChange((prev) => [...prev, created]);
        setDraftNames((current) => ({ ...current, [created.id]: created.name }));
        setNewName("");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Не удалось добавить оценщика");
      }
    });
  };

  const handleDelete = (id: number) => {
    startTransition(async () => {
      setError(null);
      try {
        await apiFetch(
          `/api/raters/${id}`,
          { method: "DELETE" },
          "Не удалось удалить оценщика",
        );
        onRatersChange((prev) => prev.filter((rater) => rater.id !== id));
        setDraftNames((current) => {
          const next = { ...current };
          delete next[id];
          return next;
        });
        setDeleteId(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Не удалось удалить оценщика");
      }
    });
  };

  const handleReorder = (sourceId: number | null, targetId: number) => {
    if (sourceId == null || sourceId === targetId || pending) return;
    const ids = raters.map((rater) => rater.id);
    const fromIndex = ids.indexOf(sourceId);
    const toIndex = ids.indexOf(targetId);
    if (fromIndex < 0 || toIndex < 0) return;
    ids.splice(fromIndex, 1);
    ids.splice(toIndex, 0, sourceId);
    startTransition(async () => {
      setError(null);
      try {
        const reordered = await apiFetch<RaterView[]>(
          "/api/raters/reorder",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ids }),
          },
          "Не удалось изменить порядок",
        );
        onRatersChange(reordered);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Не удалось изменить порядок");
      } finally {
        setDragId(null);
      }
    });
  };

  return (
    <SettingsSection title="Оценщики" description="Личные оценки каждого зрителя и общий рейтинг фильмов. Порядок в списке задаёт порядок оценок.">
      <div className="settings-raters">
      <div className="settings-rater-list">
        {raters.length === 0 && <p className="settings-empty">Добавьте первого оценщика, чтобы ставить оценки фильмам.</p>}
        {raters.map((rater, index) => (
          <div
            key={rater.id}
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => { event.preventDefault(); handleReorder(dragId, rater.id); }}
            data-dragging={dragId === rater.id}
            className="settings-rater-row"
          >
            <span className="settings-rater-grip" draggable={!pending}
              onDragStart={(event) => { event.dataTransfer.setData("text/plain", String(rater.id)); setDragId(rater.id); }}
              onDragEnd={() => setDragId(null)} aria-hidden>
              <GripVertical size={17} />
            </span>
            <div className="min-w-0 flex-1">
              <Field label="Имя" id={`rater-name-${rater.id}`}>
                <input
                  id={`rater-name-${rater.id}`}
                  className="min-h-10 w-full rounded-[var(--radius-sm)] border border-border bg-bg-deep/60 px-3 text-sm text-text outline-none focus:border-accent/60"
                  value={draftNames[rater.id] ?? rater.name}
                  disabled={pending}
                  onChange={(event) =>
                    setDraftNames((current) => ({
                      ...current,
                      [rater.id]: event.target.value,
                    }))
                  }
                  onBlur={(event) => handleRename(rater.id, event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.currentTarget.blur();
                    }
                  }}
                />
              </Field>
            </div>
            <div className="settings-rater-order">
              <Button type="button" variant="ghost" aria-label={`Поднять ${rater.name}`} disabled={pending || index === 0}
                onClick={() => handleReorder(rater.id, raters[index - 1].id)}><ArrowUp size={15} aria-hidden /></Button>
              <Button type="button" variant="ghost" aria-label={`Опустить ${rater.name}`} disabled={pending || index === raters.length - 1}
                onClick={() => handleReorder(rater.id, raters[index + 1].id)}><ArrowDown size={15} aria-hidden /></Button>
            </div>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setDeleteId(rater.id)}
              disabled={raters.length <= 1 || pending}
              aria-label={`Удалить ${rater.name}`}
            >
              <Trash2 className="h-4 w-4" aria-hidden />
            </Button>
          </div>
        ))}
      </div>

      <div className="settings-rater-add">
        <div className="min-w-0 flex-1">
          <Field label="Новый оценщик" id="new-rater-name">
            <input
              id="new-rater-name"
              className="min-h-10 w-full rounded-[var(--radius-sm)] border border-border bg-bg-deep/60 px-3 text-sm text-text outline-none focus:border-accent/60"
              value={newName}
              onChange={(event) => setNewName(event.target.value)}
              placeholder="Имя"
              disabled={pending}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  handleAdd();
                }
              }}
            />
          </Field>
        </div>
        <Button type="button" variant="primary" onClick={handleAdd} disabled={pending || !newName.trim()}>
          <Plus className="h-4 w-4" aria-hidden />
          Добавить
        </Button>
      </div>
      <p className="settings-help">Имя сохраняется по Enter или при выходе из поля. Меняйте порядок стрелками или перетаскиванием.</p>
      </div>

      {pending ? (
        <p role="status" className="settings-help">Сохранение…</p>
      ) : null}
      {error ? (
        <p className="mt-4 text-sm text-danger" role="alert">
          {error}
        </p>
      ) : null}

      <ConfirmDialog
        open={deleteId != null}
        title="Удалить оценщика?"
        description="Оценки этого человека будут удалены из всех фильмов."
        confirmLabel="Удалить"
        loading={pending}
        onConfirm={() => deleteId != null && handleDelete(deleteId)}
        onClose={() => setDeleteId(null)}
      />
    </SettingsSection>
  );
}
