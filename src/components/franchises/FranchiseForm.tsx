"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Field, TextAreaField } from "@/components/primitives/Field";
import { Button } from "@/components/primitives/Button";
import { FranchiseCoverUpload } from "@/components/franchises/FranchiseCoverUpload";
import type { FranchiseWithSlots } from "@/lib/franchises/franchise-include";
import {
  FranchiseSlotsEditor,
  slotsFromFranchise,
  slotsToPayload,
  type EditableSlot,
} from "@/components/franchises/FranchiseSlotsEditor";
import { FranchiseDeleteButton } from "@/components/franchises/FranchiseDeleteButton";
import { trimInput, trimMultilineOptional } from "@/lib/shared/text-trim";
import { apiFetch, uploadCoverAfterCreate } from "@/lib/api/client";

interface FranchiseFormProps {
  mode: "create" | "edit";
  franchise?: FranchiseWithSlots;
  onCancel?: () => void;
}

export function FranchiseForm({ mode, franchise, onCancel }: FranchiseFormProps) {
  const router = useRouter();
  const [name, setName] = useState(franchise?.name ?? "");
  const [description, setDescription] = useState(franchise?.description ?? "");
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [slots, setSlots] = useState<EditableSlot[]>(() =>
    franchise ? slotsFromFranchise(franchise.slots) : [],
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const totalSlots = slots.length;
  const filledSlots = useMemo(
    () => slots.filter((s) => s.movieId != null).length,
    [slots],
  );

  const submit = async () => {
    if (!name.trim()) {
      setError("Укажите название франшизы");
      return;
    }
    setLoading(true);
    setError(null);

    try {
      const payload = {
        name: trimInput(name),
        description: trimMultilineOptional(description),
        slots: slotsToPayload(slots),
      };

      if (mode === "create") {
        const created = await apiFetch<FranchiseWithSlots>(
          "/api/franchises",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          },
          "Не удалось создать",
        );
        await uploadCoverIfNeeded(created.id);
        router.push(`/franchises/${created.slug}`);
        router.refresh();
        return;
      }

      if (!franchise) throw new Error("Нет данных франшизы");

      const updated = await apiFetch<FranchiseWithSlots>(
        `/api/franchises/${franchise.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
        "Не удалось сохранить",
      );
      await uploadCoverIfNeeded(updated.id);
      router.push(`/franchises/${updated.slug}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setLoading(false);
    }
  };

  const uploadCoverIfNeeded = async (franchiseId: number) => {
    await uploadCoverAfterCreate(
      `/api/franchises/${franchiseId}/cover`,
      coverFile,
      coverUrl,
    );
  };

  const editFooter = (
    <>
      {mode === "edit" && franchise ? (
        <FranchiseDeleteButton
          franchiseId={franchise.id}
          name={franchise.name}
        />
      ) : null}
      <div className="ml-auto flex items-center gap-3">
        {onCancel ? (
          <Button type="button" variant="ghost" onClick={onCancel}>
            Отмена
          </Button>
        ) : null}
        <Button type="button" onClick={() => void submit()} disabled={loading}>
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          ) : null}
          {mode === "create" ? "Создать франшизу" : "Сохранить"}
        </Button>
      </div>
    </>
  );

  const createFooter = (
    <>
      <Button type="button" onClick={() => void submit()} disabled={loading}>
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        ) : null}
        Создать франшизу
      </Button>
      {onCancel ? (
        <Button type="button" variant="ghost" onClick={onCancel}>
          Отмена
        </Button>
      ) : null}
      <span className="font-mono-tech ml-auto text-xs text-faint tabular-nums">
        {filledSlots} / {totalSlots} заполнено
      </span>
    </>
  );

  return (
    <div className="space-y-6">
      <section className="surface-card space-y-4 p-5">
        <p className="font-mono-tech text-faint">основное</p>
        <div className="flex flex-col gap-6 sm:flex-row">
          {mode === "edit" && franchise ? (
            <FranchiseCoverUpload
              franchiseId={franchise.id}
              hasCover={!!franchise.coverPath}
              coverVersion={franchise.updatedAt}
            />
          ) : (
            <FranchiseCoverUpload
              onFileChange={setCoverFile}
              onUrlChange={setCoverUrl}
            />
          )}
          <div className="min-w-0 flex-1 space-y-4">
            <Field
              label="Название"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <TextAreaField
              label="Описание"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>
        </div>
      </section>

      <FranchiseSlotsEditor slots={slots} onChange={setSlots} />

      {error ? (
        <p className="text-sm text-danger" role="alert">
          {error}
        </p>
      ) : null}

      {mode === "create" ? (
        // Sticky footer anchors to the bottom of the Modal's scrollable body.
        <div className="sticky bottom-0 -mx-5 flex flex-wrap items-center gap-3 border-t border-border bg-bg-deep/80 px-5 py-4 backdrop-blur-xl">
          {createFooter}
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-3 border-t border-border pt-4">
          {editFooter}
        </div>
      )}
    </div>
  );
}
