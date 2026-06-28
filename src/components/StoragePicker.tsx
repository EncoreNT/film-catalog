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
}

export function StoragePicker({
  storageKind,
  onStorageKindChange,
  externalStorages,
  selectedStorageId,
  onSelectedStorageIdChange,
  newStorageName,
  onNewStorageNameChange,
}: StoragePickerProps) {
  return (
    <div className="space-y-3">
      <p className="font-mono-tech text-muted">хранилище</p>
      <SegmentedControl
        ariaLabel="Хранилище"
        value={storageKind}
        onChange={(v) => onStorageKindChange(v as StorageKind)}
        options={[
          {
            value: "local",
            label: "Локальный диск",
            icon: <HardDrive className="h-4 w-4" />,
          },
          {
            value: "external",
            label: "Внешний диск",
            icon: <Plug className="h-4 w-4" />,
          },
        ]}
      />
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
