"use client";

import { useEffect, useMemo, useState } from "react";
import { FileOutput, Sparkles } from "lucide-react";
import { Field } from "@/components/primitives/Field";
import { Select } from "@/components/primitives/Select";
import { Button } from "@/components/primitives/Button";
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
import { displayFilePath, commitFilePathInput, FILE_PATH_INPUT_HINT } from "@/lib/shared/display-path";
import { formatArchiveTotalSize } from "@/lib/shared/format";
import { formatDiskSpaceFitLabel } from "@/lib/shared/disk-space-labels";

interface BuildOutputPanelProps {
  outputPath: string;
  outputReleaseType: string;
  outputVersion: string;
  sizeEstimate: BuildSizeEstimate | null;
  storage: ReturnType<typeof useStoragePicker>;
  onOutputPathChange: (value: string) => void;
  onReleaseTypeChange: (value: string) => void;
  onVersionChange: (value: string) => void;
  onSuggestPath?: () => void;
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
  onSuggestPath,
}: BuildOutputPanelProps) {
  const [pathInput, setPathInput] = useState(() =>
    outputPath ? displayFilePath(outputPath) : "",
  );
  const [freeBytes, setFreeBytes] = useState<number | null>(null);
  const [diskLoading, setDiskLoading] = useState(false);

  useEffect(() => {
    setPathInput(outputPath ? displayFilePath(outputPath) : "");
  }, [outputPath]);

  useEffect(() => {
    if (!outputPath.trim()) {
      setFreeBytes(null);
      return;
    }

    const timer = window.setTimeout(() => {
      setDiskLoading(true);
      void fetch(`/api/disk-space?path=${encodeURIComponent(outputPath)}`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data: { freeBytes?: number } | null) => {
          setFreeBytes(typeof data?.freeBytes === "number" ? data.freeBytes : null);
        })
        .catch(() => setFreeBytes(null))
        .finally(() => setDiskLoading(false));
    }, 400);

    return () => window.clearTimeout(timer);
  }, [outputPath]);

  const diskFitLabel = useMemo(
    () => formatDiskSpaceFitLabel(freeBytes, sizeEstimate?.totalBytes ?? null),
    [freeBytes, sizeEstimate?.totalBytes],
  );

  const commitPathInput = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) {
      setPathInput("");
      onOutputPathChange("");
      return;
    }
    const { runtime, display } = commitFilePathInput(trimmed);
    setPathInput(display);
    onOutputPathChange(runtime);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-sm)] border border-accent/35 bg-accent/[0.08] text-accent">
          <FileOutput className="h-4 w-4" strokeWidth={1.5} aria-hidden />
        </span>
        <SectionLabel>назначение</SectionLabel>
      </div>

      <BuildOutputSizeNote estimate={sizeEstimate} />

      {outputPath ? (
        <p className="font-mono-tech text-xs text-muted">
          {diskLoading
            ? "Проверяем свободное место…"
            : freeBytes != null
              ? [
                  `Свободно: ${formatArchiveTotalSize(freeBytes)}`,
                  sizeEstimate
                    ? `оценка сборки: ${formatBuildOutputSizeLabel(sizeEstimate)}`
                    : null,
                  diskFitLabel,
                ]
                  .filter(Boolean)
                  .join(" · ")
              : null}
        </p>
      ) : null}

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
        hint={FILE_PATH_INPUT_HINT}
      >
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            className="focus-ring font-mono-tech normal-case min-h-11 w-full flex-1 rounded-[var(--radius)] border border-border bg-bg-elevated px-3 py-2 text-xs text-text placeholder:text-muted/50"
            value={pathInput}
            onChange={(e) => setPathInput(e.target.value)}
            onBlur={() => commitPathInput(pathInput)}
            placeholder="D:\TV\Movies\custom.mkv или /mnt/d/TV/Movies/custom.mkv"
            spellCheck={false}
            autoComplete="off"
          />
          {onSuggestPath ? (
            <Button
              type="button"
              variant="secondary"
              className="shrink-0"
              onClick={onSuggestPath}
            >
              <Sparkles className="h-4 w-4" aria-hidden />
              Предложить имя
            </Button>
          ) : null}
        </div>
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

function formatBuildOutputSizeLabel(estimate: BuildSizeEstimate): string {
  const formatted = formatArchiveTotalSize(estimate.totalBytes);
  if (!formatted) return "—";
  return estimate.actual ? formatted : `≈ ${formatted}`;
}
