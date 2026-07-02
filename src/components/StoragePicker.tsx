"use client";

import { HardDrive, Plug } from "lucide-react";
import { Field } from "./primitives/Field";
import { Select } from "./primitives/Select";
import { SegmentedControl } from "./primitives/SegmentedControl";

export type StorageKind = "local" | "external";

export interface StorageOption {
  id: number;
  name: string;
  type: "LOCAL" | "EXTERNAL";
  path?: string | null;
}

interface StoragePickerProps {
  storageKind: StorageKind;
  onStorageKindChange: (value: StorageKind) => void;
  externalStorages: StorageOption[];
  selectedStorageId: string;
  onSelectedStorageIdChange: (value: string) => void;
  newStorageName: string;
  onNewStorageNameChange: (value: string) => void;
  compact?: boolean;
}

export function StoragePicker({
  storageKind,
  onStorageKindChange,
  externalStorages,
  selectedStorageId,
  onSelectedStorageIdChange,
  newStorageName,
  onNewStorageNameChange,
  compact = false,
}: StoragePickerProps) {
  return (
    <div className={compact ? "space-y-2" : "space-y-3"}>
      <div
        className={
          compact
            ? "flex flex-wrap items-center gap-x-4 gap-y-2"
            : undefined
        }
      >
        {!compact ? (
          <p className="font-mono-tech text-muted">хранилище</p>
        ) : (
          <span className="text-sm text-muted">Хранилище</span>
        )}
        <SegmentedControl
          ariaLabel="Хранилище"
          value={storageKind}
          onChange={(v) => onStorageKindChange(v as StorageKind)}
          fullWidth={!compact}
          size={compact ? "compact" : "default"}
          options={[
            {
              value: "local",
              label: compact ? "Локальный" : "Локальный диск",
              icon: <HardDrive className={compact ? "h-3.5 w-3.5" : "h-4 w-4"} />,
            },
            {
              value: "external",
              label: compact ? "Внешний" : "Внешний диск",
              icon: <Plug className={compact ? "h-3.5 w-3.5" : "h-4 w-4"} />,
            },
          ]}
        />
      </div>
      {storageKind === "external" ? (
        externalStorages.length > 0 ? (
          <Select
            label="Выберите диск"
            value={selectedStorageId}
            onChange={onSelectedStorageIdChange}
            options={[
              { value: "", label: "— новый диск —" },
              ...externalStorages.map((s) => ({
                value: String(s.id),
                label: s.name,
              })),
            ]}
          />
        ) : null
      ) : null}
      {storageKind === "external" && !selectedStorageId ? (
        <Field
          label="Название нового диска"
          value={newStorageName}
          onChange={(e) => onNewStorageNameChange(e.target.value)}
          placeholder="Например, Seagate 4TB"
        />
      ) : null}
    </div>
  );
}
