"use client";

import type { ReactNode } from "react";
import { Field } from "@/components/primitives/Field";
import { DiskSpaceFeedback } from "@/components/shared/DiskSpaceFeedback";
import { FolderPathField } from "@/components/shared/FolderPathField";

export function ReleaseTransferDestinationForm({
  storageSection,
  folderFieldId,
  filenameFieldId,
  folderLabel = "Папка назначения",
  targetDir,
  onTargetDirChange,
  filename,
  onFilenameChange,
  onFilenameBlur,
  disabled,
  diskLoading,
  diskStatusLine,
  diskShortfall,
  diskFreeBytes,
  targetDirRuntime,
  collision,
  sameAsSource,
  targetDisplay,
}: {
  storageSection?: ReactNode;
  folderFieldId: string;
  filenameFieldId: string;
  folderLabel?: string;
  targetDir: string;
  onTargetDirChange: (runtimePath: string, displayPath: string) => void;
  filename: string;
  onFilenameChange: (value: string) => void;
  onFilenameBlur: () => void;
  disabled?: boolean;
  diskLoading: boolean;
  diskStatusLine: string | null;
  diskShortfall: string | null;
  diskFreeBytes: number | null;
  targetDirRuntime: string;
  collision?: boolean;
  sameAsSource?: boolean;
  targetDisplay?: string | null;
}) {
  return (
    <div className="space-y-4">
      {storageSection}
      <div>
        <FolderPathField
          id={folderFieldId}
          label={folderLabel}
          value={targetDir}
          onChange={onTargetDirChange}
          disabled={disabled}
        />
        <DiskSpaceFeedback
          targetDirRuntime={targetDirRuntime}
          loading={diskLoading}
          statusLine={diskStatusLine}
          shortfall={diskShortfall}
          freeBytes={diskFreeBytes}
        />
      </div>
      <Field
        id={filenameFieldId}
        label="Имя файла"
        variant="underline"
        className="font-mono-tech normal-case"
        value={filename}
        onChange={(e) => onFilenameChange(e.target.value)}
        onBlur={onFilenameBlur}
        spellCheck={false}
        disabled={disabled}
      />
      {collision ? (
        <p className="text-sm text-ember" role="alert">
          Файл с таким именем уже существует. Предложено новое имя с суффиксом.
        </p>
      ) : null}
      {sameAsSource ? (
        <p className="text-sm text-danger" role="alert">
          Путь совпадает с текущим расположением файла.
        </p>
      ) : null}
      {targetDisplay ? (
        <p className="break-all font-mono-tech text-xs leading-relaxed text-faint">
          <span className="text-[10px] uppercase tracking-[0.12em]">куда </span>
          {targetDisplay}
        </p>
      ) : null}
    </div>
  );
}
