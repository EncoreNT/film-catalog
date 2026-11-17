"use client";

import { useState } from "react";
import { ChevronDown, HardDrive } from "lucide-react";
import { StorageFileTable } from "./StorageFileTable";
import type { StorageFile } from "@/lib/storages/storage-files";
import { SettingsSection } from "./SettingsSection";
import { Field } from "@/components/primitives/Field";
import { Button } from "@/components/primitives/Button";
import { Select } from "@/components/primitives/Select";
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

function StorageCapacityForm({
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
    <form onSubmit={save} className="settings-storage-capacity" aria-label={`Ёмкость диска ${storage.name}`}>
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
              <Select
                compact
                id={`${inputId}-unit`}
                label={`Единица ёмкости диска ${storage.name}`}
                value={draft.unit}
                options={[{ value: "gb", label: "ГБ" }, { value: "tb", label: "ТБ" }]}
                disabled={pending}
                onChange={(value) => {
                  const unit = value as CapacityUnit;
                  changeDraft(
                    invalid ? draft.value : capacityValue(capacityBytes, unit),
                    unit,
                  );
                }}
              />
            </div>
          </Field>
        </fieldset>
        <Button type="submit" variant={dirty && !invalid ? "primary" : "secondary"}
          disabled={pending || !dirty || invalid}>
          {pending ? "Сохранение…" : "Сохранить"}
        </Button>
      </div>
      <p id={`${inputId}-help`} className={`text-xs ${invalid ? "text-danger" : "text-muted"}`}>
        {invalid
          ? "Введите положительное число, например 2 или 0,5."
          : capacityBytes == null
            ? "Оставьте пустым, если ёмкость неизвестна."
            : `≈ ${formatBytes(capacityBytes, { unit: "binary" })}`}
      </p>
      {saved && <span role="status" className="text-xs text-muted">Сохранено</span>}
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
    </form>
  );
}

function StorageRow({ storage, onSaved }: {
  storage: StorageOption;
  onSaved: (storage: StorageOption) => void;
}) {
  const [open, setOpen] = useState(false);
  const [files, setFiles] = useState<StorageFile[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const panelId = `storage-files-${storage.id}`;

  async function loadFiles() {
    setLoading(true);
    setError(null);
    try {
      setFiles(await apiFetch<StorageFile[]>(
        `/api/storages/${storage.id}/files`, undefined, "Не удалось загрузить список файлов",
      ));
    } catch {
      setError("Не удалось загрузить список файлов.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="settings-storage-row">
      <div className="settings-storage-identity">
        <h3>
          <button type="button" className="settings-storage-toggle focus-ring"
            aria-expanded={open} aria-controls={panelId}
            onClick={() => {
              setOpen(!open);
              if (!open && files === null && !loading) void loadFiles();
            }}>
            <HardDrive size={17} className="shrink-0 text-accent" aria-hidden />
            <span className="min-w-0">
              <span className="block break-words">{storage.name}</span>
              <span className="settings-storage-toggle-label">
                Файлы на диске · {files?.length ?? storage._count?.releases ?? 0}
                <ChevronDown size={14} aria-hidden />
              </span>
            </span>
          </button>
        </h3>
      </div>
      <div className="settings-storage-usage"><StorageUsage storage={storage} /></div>
      <StorageCapacityForm storage={storage} onSaved={onSaved} />
      <div id={panelId} hidden={!open} className="settings-storage-files">
        {loading && <p role="status">Загрузка файлов…</p>}
        {error && <div className="flex flex-wrap items-center gap-3">
          <p role="alert">{error}</p>
          <Button type="button" variant="secondary" onClick={loadFiles}>Повторить</Button>
        </div>}
        {files && <StorageFileTable files={files} storageName={storage.name} />}
      </div>
    </div>
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
          <StorageRow
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
