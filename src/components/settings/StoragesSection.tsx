"use client";

import { useState } from "react";
import { HardDrive } from "lucide-react";
import { SettingsSection } from "./SettingsSection";
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
      className="settings-storage-row"
      aria-label={`Ёмкость диска ${storage.name}`}
    >
      <div className="settings-storage-identity">
        <h3>
          <HardDrive
            className="mt-0.5 h-4 w-4 shrink-0 text-accent"
            aria-hidden
          />
          <span className="break-words">{storage.name}</span>
        </h3>
      </div>
      <div className="settings-storage-usage"><StorageUsage storage={storage} /></div>
      <div className="settings-storage-capacity">
        <div className="settings-capacity-actions">
        <fieldset disabled={pending}>
          <Field label="Ёмкость на упаковке" id={inputId}>
            <div className="settings-capacity-input">
              <input
                id={inputId}
                inputMode="decimal"
                value={draft.value}
                onChange={(event) =>
                  changeDraft(event.target.value, draft.unit)
                }
                placeholder="Не задана"
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
          <Button type="submit" variant={dirty && !invalid ? "primary" : "secondary"}
            disabled={pending || !dirty || invalid}>
            {pending ? "Сохранение…" : "Сохранить"}
          </Button>
        </div>
        <p
          id={`${inputId}-help`}
          className={`text-xs ${invalid ? "text-danger" : "text-muted"}`}
        >
          {invalid
            ? "Введите положительное число, например 2 или 0,5."
            : capacityBytes == null
              ? "Оставьте пустым, если ёмкость неизвестна."
              : `≈ ${formatBytes(capacityBytes, { unit: "binary" })}`}
        </p>
          {saved && (
            <span role="status" className="text-xs text-muted">
              Сохранено
            </span>
          )}
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
    <SettingsSection title="Внешние диски" description="Ёмкость и заполненность вашей коллекцией. Укажите объём с упаковки каждого диска.">
      {storages.length === 0 ? (
        <p className="settings-empty">
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
      <aside className="settings-note">
        <p>Учитываются только файлы в каталоге. Место, занятое другими данными, неизвестно.</p>
        <p>Ёмкость вводится как на упаковке. Размеры файлов и заполненность рассчитываются через 1024 и отображаются в привычных ГБ/ТБ, поэтому число может отличаться от маркировки.</p>
      </aside>
    </SettingsSection>
  );
}
