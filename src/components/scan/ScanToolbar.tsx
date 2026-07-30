"use client";

import { ScanSearch } from "lucide-react";
import { Button } from "@/components/primitives/Button";
import { FolderPathField } from "@/components/shared/FolderPathField";
import { StoragePicker } from "@/components/shared/StoragePicker";
import type { StorageKind, StorageOption } from "@/lib/shared/storage-types";

interface ScanToolbarProps {
  scanRoot: string;
  onScanRootChange: (runtimePath: string, displayPath: string) => void;
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
        <FolderPathField
          layout="toolbar"
          label="Корневая папка"
          value={scanRoot}
          onChange={onScanRootChange}
          disabled={scanning}
        />

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
