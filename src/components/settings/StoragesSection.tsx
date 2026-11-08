"use client";

import { useState } from "react";
import { HardDrive } from "lucide-react";
import {
  MachinedCard,
  CardSectionHeader,
} from "@/components/primitives/MachinedCard";
import { Field } from "@/components/primitives/Field";
import { Button } from "@/components/primitives/Button";
import { StorageUsage } from "@/components/shared/StorageUsage";
import { apiFetch } from "@/lib/api/client";
import type { StorageOption } from "@/lib/shared/storage-types";
import { formatBytes } from "@/lib/shared/format-bytes";
import {
  capacityDraft,
  capacityValue,
  parseCapacityBytes,
  type CapacityUnit,
} from "@/lib/storages/storage-capacity";

function StorageCapacityRow({
  storage,
  onSaved,
}: {
  storage: StorageOption;
  onSaved: (storage: StorageOption) => void;
}) {
  const [draft, setDraft] = useState(() =>
    capacityDraft(storage.capacityBytes),
  );
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const capacityBytes = parseCapacityBytes(draft.value, draft.unit);
  const invalid = Number.isNaN(capacityBytes);
  const dirty = capacityBytes !== (storage.capacityBytes ?? null);
  const inputId = `storage-capacity-${storage.id}`;

  const changeDraft = (value: string, unit: CapacityUnit) => {
    setDraft({ value, unit });
    setSaved(false);
    setError(null);
  };

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (invalid || !dirty || pending) return;
    setPending(true);
    setError(null);
    try {
      const updated = await apiFetch<StorageOption>(
        `/api/storages/${storage.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ capacityBytes }),
        },
        "Не удалось сохранить ёмкость диска",
      );
      onSaved({ ...storage, capacityBytes: updated.capacityBytes });
      setSaved(true);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Не удалось сохранить ёмкость диска",
      );
    } finally {
      setPending(false);
    }
  };

  return (
    <form
      onSubmit={save}
      className="grid min-w-0 gap-5 border-t border-border py-6 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,1fr)] lg:gap-12"
      aria-label={`Ёмкость диска ${storage.name}`}
    >
      <div className="min-w-0">
        <h3 className="mb-4 flex items-start gap-2 font-medium text-text">
          <HardDrive
            className="mt-0.5 h-4 w-4 shrink-0 text-accent"
            aria-hidden
          />
          <span className="break-words">{storage.name}</span>
        </h3>
        <StorageUsage storage={storage} />
      </div>
      <div className="min-w-0 space-y-3">
        <fieldset disabled={pending}>
          <Field label="Ёмкость на упаковке" id={inputId}>
            <div className="flex overflow-hidden rounded-[var(--radius)] border border-border bg-bg-elevated focus-within:border-accent/60">
              <input
                id={inputId}
                inputMode="decimal"
                value={draft.value}
                onChange={(event) =>
                  changeDraft(event.target.value, draft.unit)
                }
                placeholder={
                  draft.unit === "tb" ? "Например, 2" : "Например, 500"
                }
                aria-invalid={invalid}
                aria-describedby={`${inputId}-help`}
                className="focus-ring min-h-11 w-full min-w-0 bg-transparent px-3 text-sm text-text outline-none"
              />
              <select
                aria-label={`Единица ёмкости диска ${storage.name}`}
                value={draft.unit}
                onChange={(event) => {
                  const unit = event.target.value as CapacityUnit;
                  changeDraft(
                    invalid ? draft.value : capacityValue(capacityBytes, unit),
                    unit,
                  );
                }}
                className="focus-ring min-h-11 shrink-0 cursor-pointer border-l border-border bg-bg-elevated px-3 text-sm text-accent"
              >
                <option value="gb">ГБ</option>
                <option value="tb">ТБ</option>
              </select>
            </div>
          </Field>
        </fieldset>
        <p
          id={`${inputId}-help`}
          className={`text-xs ${invalid ? "text-danger" : "text-muted"}`}
        >
          {invalid
            ? "Введите положительное число, например 2 или 0,5."
            : capacityBytes == null
              ? "Оставьте пустым, если ёмкость неизвестна."
              : `В двоичных единицах: ${formatBytes(capacityBytes, { unit: "binary" })}.`}
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="submit"
            variant="secondary"
            disabled={pending || !dirty || invalid}
          >
            {pending ? "Сохранение…" : "Сохранить ёмкость"}
          </Button>
          {saved && (
            <span role="status" className="text-xs text-muted">
              Сохранено
            </span>
          )}
        </div>
        {error && (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        )}
      </div>
    </form>
  );
}

export function StoragesSection({
  storages,
  onStorageSaved,
}: {
  storages: StorageOption[];
  onStorageSaved: (storage: StorageOption) => void;
}) {
  return (
    <MachinedCard variant="calm">
      <CardSectionHeader
        label="хранилище"
        title="Внешние диски"
        className="mb-3"
      />
      <p className="mb-2 max-w-3xl text-sm leading-relaxed text-muted">
        Укажите ёмкость с упаковки. Заполненность считается по размерам файлов в
        каталоге, без обращения к диску.
      </p>
      <p className="mb-6 max-w-3xl text-xs leading-relaxed text-faint">
        1 ТБ = 1 000 ГБ. Диск на 2 ТБ содержит примерно 1,82 ТиБ — разница в
        единицах измерения, а не потеря места. Место, занятое другими данными,
        неизвестно.
      </p>
      {storages.length === 0 ? (
        <p className="py-4 text-sm text-muted">
          Внешних дисков пока нет. Добавьте диск при создании релиза или
          сканировании файлов.
        </p>
      ) : (
        storages.map((storage) => (
          <StorageCapacityRow
            key={storage.id}
            storage={storage}
            onSaved={onStorageSaved}
          />
        ))
      )}
    </MachinedCard>
  );
}
