"use client";

import { FolderOpen, ScanSearch } from "lucide-react";
import { Button } from "@/components/primitives/Button";
import { StoragePicker } from "@/components/shared/StoragePicker";
import { FILE_PATH_INPUT_HINT } from "@/lib/shared/display-path";
import type { StorageKind, StorageOption } from "@/lib/shared/storage-types";

interface ScanToolbarProps {
  scanRoot: string;
  onScanRootChange: (value: string) => void;
  onScanRootBlur: () => void;
  scanning: boolean;
  error: string | null;
  storageKind: StorageKind;
  onStorageKindChange: (value: StorageKind) => void;
  externalStorages: StorageOption[];
  selectedStorageId: string;
  onSelectedStorageIdChange: (value: string) => void;
  onCreateExternalStorage: (name: string) => Promise<void>;
  onScan: () => void;
}

export function ScanToolbar({
  scanRoot,
  onScanRootChange,
  onScanRootBlur,
  scanning,
  error,
  storageKind,
  onStorageKindChange,
  externalStorages,
  selectedStorageId,
  onSelectedStorageIdChange,
  onCreateExternalStorage,
  onScan,
}: ScanToolbarProps) {
  const configured = scanRoot.trim().length > 0;

  return (
    <div className="space-y-2">
      <div className="surface-card grid grid-cols-1 gap-2 p-2 xl:grid-cols-[minmax(0,1fr)_auto_auto] xl:items-center">
        <label className="relative min-w-0">
          <span className="sr-only">Корневая папка</span>
          <FolderOpen
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-accent/70"
            aria-hidden
          />
          <input
            value={scanRoot}
            onChange={(e) => onScanRootChange(e.target.value)}
            onBlur={onScanRootBlur}
            placeholder="D:\Movies или /mnt/d/Movies"
            title={FILE_PATH_INPUT_HINT}
            className="focus-ring min-h-9 w-full rounded-[var(--radius-sm)] border border-border bg-bg-elevated/80 py-2 pl-10 pr-3 font-mono text-sm text-text placeholder:font-sans placeholder:text-faint"
          />
        </label>

        <StoragePicker
          layout="toolbar"
          storageKind={storageKind}
          onStorageKindChange={onStorageKindChange}
          externalStorages={externalStorages}
          selectedStorageId={selectedStorageId}
          onSelectedStorageIdChange={onSelectedStorageIdChange}
          onCreateExternalStorage={onCreateExternalStorage}
        />

        <Button
          variant="primary"
          loading={scanning}
          onClick={onScan}
          disabled={scanning || !configured}
          className="w-full shrink-0 justify-self-end xl:w-auto"
        >
          <ScanSearch className="h-4 w-4" aria-hidden />
          Сканировать
        </Button>
      </div>

      {error ? (
        <p className="px-1 text-sm text-danger" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
