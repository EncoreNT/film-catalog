"use client";

import { FileOutput } from "lucide-react";
import { Field } from "@/components/primitives/Field";
import { Select } from "@/components/primitives/Select";
import { StoragePicker } from "@/components/shared/StoragePicker";
import type { useStoragePicker } from "@/hooks/useStoragePicker";
import {
  DEFAULT_MOVIE_VERSION,
  MOVIE_VERSIONS,
  RELEASE_TYPES,
} from "@/lib/shared/dictionaries";
import { SectionLabel } from "@/components/builds/BuildAtoms";
import { BuildOutputSizeNote } from "@/components/builds/BuildOutputSizeNote";
import type { BuildSizeEstimate } from "@/lib/builds/build-output-size";

interface BuildOutputPanelProps {
  outputPath: string;
  outputReleaseType: string;
  outputVersion: string;
  sizeEstimate: BuildSizeEstimate | null;
  storage: ReturnType<typeof useStoragePicker>;
  onOutputPathChange: (value: string) => void;
  onReleaseTypeChange: (value: string) => void;
  onVersionChange: (value: string) => void;
}

export function BuildOutputPanel({
  outputPath,
  outputReleaseType,
  outputVersion,
  sizeEstimate,
  storage,
  onOutputPathChange,
  onReleaseTypeChange,
  onVersionChange,
}: BuildOutputPanelProps) {
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-sm)] border border-accent/35 bg-accent/[0.08] text-accent">
          <FileOutput className="h-4 w-4" strokeWidth={1.5} aria-hidden />
        </span>
        <SectionLabel>назначение</SectionLabel>
      </div>

      <BuildOutputSizeNote estimate={sizeEstimate} />

      <StoragePicker
        compact
        storageKind={storage.storageKind}
        onStorageKindChange={storage.setStorageKind}
        externalStorages={storage.externalStorages}
        selectedStorageId={storage.selectedStorageId}
        onSelectedStorageIdChange={storage.setSelectedStorageId}
        onCreateExternalStorage={storage.createExternalStorage}
      />

      <Field
        label="Путь к MKV"
        hint="Абсолютный путь к новому файлу сборки"
      >
        <input
          className="focus-ring font-mono-tech min-h-11 w-full rounded-[var(--radius)] border border-border bg-bg-elevated px-3 py-2 text-xs text-text placeholder:text-muted/50"
          value={outputPath}
          onChange={(e) => onOutputPathChange(e.target.value)}
          placeholder="/mnt/d/Movies/custom.mkv"
          spellCheck={false}
          autoComplete="off"
        />
      </Field>

      <div className="grid gap-3">
        <Select
          label="Тип релиза"
          value={outputReleaseType}
          onChange={onReleaseTypeChange}
          options={[{ value: "", label: "—" }, ...RELEASE_TYPES]}
          preserveOrder
        />
        <Select
          label="Версия"
          value={outputVersion || DEFAULT_MOVIE_VERSION}
          onChange={onVersionChange}
          options={MOVIE_VERSIONS}
          preserveOrder
        />
      </div>
    </div>
  );
}
