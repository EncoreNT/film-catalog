"use client";

import { useEffect, useState, useTransition, type Dispatch, type SetStateAction } from "react";
import { GripVertical, Plus, Trash2 } from "lucide-react";
import { MachinedCard, CardSectionHeader } from "@/components/primitives/MachinedCard";
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

  useEffect(() => {
    setDraftNames((current) => {
      const next = { ...current };
      for (const rater of raters) {
        if (!(rater.id in next)) {
          next[rater.id] = rater.name;
        }
      }
      for (const id of Object.keys(next).map(Number)) {
        if (!raters.some((rater) => rater.id === id)) {
          delete next[id];
        }
      }
      return next;
    });
  }, [raters]);

  const savedNameFor = (id: number) =>
    raters.find((rater) => rater.id === id)?.name ?? "";

  const handleRename = (id: number, name: string) => {
    const trimmed = name.trim();
    if (!trimmed || trimmed === savedNameFor(id)) return;

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
        setDeleteId(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Не удалось удалить оценщика");
      }
    });
  };

  const handleDrop = (targetId: number) => {
    if (dragId == null || dragId === targetId) return;
    const ids = raters.map((rater) => rater.id);
    const fromIndex = ids.indexOf(dragId);
    const toIndex = ids.indexOf(targetId);
    if (fromIndex < 0 || toIndex < 0) return;
    ids.splice(fromIndex, 1);
    ids.splice(toIndex, 0, dragId);
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
    <MachinedCard variant="calm">
      <CardSectionHeader
        label="оценщики"
        title="Кто оценивает фильмы"
        className="mb-5"
      />
      <p className="mb-5 text-sm text-muted">
        Каждый оценщик ставит свою оценку. В каталоге показывается средняя и отдельные
        оценки с именами. Имя сохраняется при выходе из поля или по Enter.
      </p>

      <div className="space-y-3">
        {raters.map((rater) => (
          <div
            key={rater.id}
            draggable
            onDragStart={() => setDragId(rater.id)}
            onDragOver={(event) => event.preventDefault()}
            onDrop={() => handleDrop(rater.id)}
            className="flex items-center gap-2 rounded-[var(--radius-sm)] border border-border bg-bg-elevated/50 px-3 py-2"
          >
            <GripVertical className="h-4 w-4 shrink-0 cursor-grab text-faint" aria-hidden />
            <div className="min-w-0 flex-1">
              <Field label="Имя">
                <input
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

      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="min-w-0 flex-1">
          <Field label="Новый оценщик">
            <input
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
        <Button type="button" onClick={handleAdd} disabled={pending || !newName.trim()}>
          <Plus className="h-4 w-4" aria-hidden />
          Добавить
        </Button>
      </div>

      {pending ? (
        <p className="font-mono-tech mt-4 text-xs text-faint">сохранение…</p>
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
        onConfirm={() => deleteId != null && handleDelete(deleteId)}
        onClose={() => setDeleteId(null)}
      />
    </MachinedCard>
  );
}
