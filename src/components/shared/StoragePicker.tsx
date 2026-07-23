"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronDown,
  HardDrive,
  Plug,
} from "lucide-react";
import { InfoHint } from "@/components/primitives/InfoHint";
import { CreatableCombobox } from "@/components/primitives/CreatableCombobox";
import { SegmentedControl } from "@/components/primitives/SegmentedControl";
import type { StorageKind, StorageOption } from "@/lib/shared/storage-types";

type StoragePickerLayout = "default" | "embedded" | "toolbar";

interface StoragePickerProps {
  storageKind: StorageKind;
  onStorageKindChange: (value: StorageKind) => void;
  externalStorages: StorageOption[];
  selectedStorageId: string;
  onSelectedStorageIdChange: (value: string) => void;
  onCreateExternalStorage: (name: string) => Promise<void>;
  layout?: StoragePickerLayout;
  /** Section label; default «Хранилище». */
  label?: string;
  /** Stack label and stretch segment + disk select to full modal width. */
  fullWidth?: boolean;
  /** @deprecated Use layout="embedded" */
  embedded?: boolean;
  /** @deprecated Use layout="embedded" */
  compact?: boolean;
}

export type { StorageKind, StorageOption } from "@/lib/shared/storage-types";

export function StoragePicker({
  storageKind,
  onStorageKindChange,
  externalStorages,
  selectedStorageId,
  onSelectedStorageIdChange,
  onCreateExternalStorage,
  layout,
  label = "Хранилище",
  fullWidth = false,
  embedded = false,
  compact = false,
}: StoragePickerProps) {
  const resolvedLayout: StoragePickerLayout =
    layout ?? (embedded || compact ? "embedded" : "default");
  const isToolbar = resolvedLayout === "toolbar";
  const isEmbedded = resolvedLayout === "embedded" || isToolbar;

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [creatingName, setCreatingName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedStorage = useMemo(
    () =>
      externalStorages.find((s) => String(s.id) === selectedStorageId) ?? null,
    [externalStorages, selectedStorageId],
  );

  const trimmedQuery = query.trim();
  const filteredStorages = useMemo(() => {
    if (!trimmedQuery) return externalStorages;
    const q = trimmedQuery.toLowerCase();
    return externalStorages.filter((s) => s.name.toLowerCase().includes(q));
  }, [externalStorages, trimmedQuery]);

  const canCreate =
    trimmedQuery.length > 0 &&
    !externalStorages.some(
      (s) => s.name.toLowerCase() === trimmedQuery.toLowerCase(),
    );

  const openDropdown = useCallback(() => {
    setOpen(true);
    setQuery("");
    setError(null);
    setTimeout(() => inputRef.current?.focus(), 40);
  }, []);

  const closeDropdown = useCallback(() => {
    setOpen(false);
    setQuery("");
    setCreatingName(null);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        closeDropdown();
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeDropdown();
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, closeDropdown]);

  const handleStorageKindChange = (value: StorageKind) => {
    if (value === "external") {
      onStorageKindChange(value);
      openDropdown();
      return;
    }
    closeDropdown();
    onStorageKindChange(value);
  };

  const pickStorage = (storage: StorageOption) => {
    onSelectedStorageIdChange(String(storage.id));
    closeDropdown();
  };

  const createStorage = async (name: string) => {
    setCreatingName(name);
    setError(null);
    try {
      await onCreateExternalStorage(name);
      closeDropdown();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось создать диск");
    } finally {
      setCreatingName(null);
    }
  };

  const labelHint = (
    <>
      {isToolbar ? (
        <span className="flex shrink-0 items-center gap-1 font-mono-tech text-xs text-muted">
          {label}
          <InfoHint
            label={label}
            text="Локальный — без записи в каталоге дисков. Внешний — выберите или создайте именованный накопитель."
          />
        </span>
      ) : isEmbedded ? (
        <span className="flex items-center gap-1.5 text-sm text-muted">
          {label}
          <InfoHint
            label={label}
            text="Локальный — без записи в каталоге дисков. Внешний — выберите или создайте именованный накопитель."
          />
        </span>
      ) : (
        <div className="flex items-center gap-1.5">
          <p className="font-mono-tech text-muted">{label.toLowerCase()}</p>
          <InfoHint
            label={label}
            text="Локальный — без записи в каталоге дисков. Внешний — выберите или создайте именованный накопитель."
          />
        </div>
      )}
    </>
  );

  const externalSegmentTitle =
    isToolbar && selectedStorage ? selectedStorage.name : undefined;

  const externalLabel = isToolbar ? (
    <span className="flex min-w-0 items-center gap-1">
      <span className="truncate">
        {storageKind === "external"
          ? (selectedStorage?.name ?? "Выберите диск")
          : "Внешний"}
      </span>
      {storageKind === "external" ? (
        <ChevronDown
          className={`h-3 w-3 shrink-0 opacity-80 transition-transform duration-200 ${
            open ? "rotate-180" : ""
          }`}
          aria-hidden
        />
      ) : null}
    </span>
  ) : isEmbedded ? (
    "Внешний"
  ) : (
    "Внешний диск"
  );

  const segmentControl = (
    <SegmentedControl
      ariaLabel="Хранилище"
      value={storageKind}
      onChange={(v) => handleStorageKindChange(v as StorageKind)}
      fullWidth={fullWidth || !isEmbedded}
      size={isEmbedded ? "compact" : "default"}
      options={[
        {
          value: "local",
          label: isEmbedded ? "Локальный" : "Локальный диск",
          icon: (
            <HardDrive
              className={isEmbedded ? "h-3.5 w-3.5" : "h-4 w-4"}
              aria-hidden
            />
          ),
        },
        {
          value: "external",
          label: externalLabel,
          title: externalSegmentTitle,
          className: isToolbar ? "min-w-[9.5rem] max-w-[9.5rem]" : undefined,
          icon: (
            <Plug
              className={isEmbedded ? "h-3.5 w-3.5" : "h-4 w-4"}
              aria-hidden
            />
          ),
        },
      ]}
    />
  );

  const externalMenu =
    open && storageKind === "external" ? (
      <CreatableCombobox
        open
        query={query}
        onQueryChange={setQuery}
        items={filteredStorages.map((s) => ({
          id: s.id,
          label: s.name,
          selected: String(s.id) === selectedStorageId,
          meta:
            s._count?.releases != null ? (
              <span className="font-mono-tech shrink-0 text-xs text-faint">
                {s._count.releases}
              </span>
            ) : undefined,
        }))}
        onSelect={(item) => {
          const storage = externalStorages.find((s) => s.id === item.id);
          if (storage) pickStorage(storage);
        }}
        disabled={creatingName != null}
        canCreate={canCreate}
        creating={creatingName === trimmedQuery}
        onCreate={createStorage}
        emptyMessage={
          trimmedQuery
            ? "Ничего не найдено"
            : "Нет сохранённых внешних дисков"
        }
        itemIcon={
          <Plug className="h-3.5 w-3.5 shrink-0 text-accent/70" aria-hidden />
        }
        inputRef={inputRef}
        className="surface-elevated scroll-subtle absolute left-0 top-full z-50 mt-1 max-h-64 min-w-full w-[max(100%,min(100vw-2rem,16rem))] overflow-auto p-1 shadow-2xl"
      />
    ) : null;

  const externalSelect =
    storageKind === "external" && !isToolbar ? (
      <div
        className={`relative w-full ${fullWidth ? "" : "max-w-md"}`}
        ref={containerRef}
      >
        <button
          type="button"
          onClick={open ? closeDropdown : openDropdown}
          aria-haspopup="listbox"
          aria-expanded={open}
          className={`focus-ring flex min-h-9 w-full cursor-pointer items-center justify-between gap-2 rounded-[var(--radius-sm)] border px-3 text-sm transition-colors ${
            open
              ? "border-accent/50 bg-bg-surface"
              : "border-border bg-bg-surface text-text hover:border-border-strong"
          }`}
        >
          <span className="flex min-w-0 items-center gap-2">
            <Plug
              className="h-3.5 w-3.5 shrink-0 text-accent/70"
              aria-hidden
            />
            <span
              className={`truncate ${selectedStorage ? "text-text" : "text-muted"}`}
            >
              {selectedStorage?.name ?? "Выберите диск…"}
            </span>
          </span>
          <ChevronDown
            className={`h-4 w-4 shrink-0 text-muted transition-transform duration-200 ${
              open ? "rotate-180" : ""
            }`}
            aria-hidden
          />
        </button>
        {externalMenu}
      </div>
    ) : null;

  if (isToolbar) {
    return (
      <div className="shrink-0" ref={containerRef}>
        <div className="flex items-center gap-2">
          {labelHint}
          <div className="relative">
            {segmentControl}
            {externalMenu}
          </div>
        </div>
        {error ? (
          <p className="mt-1 text-xs text-danger" role="alert">
            {error}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div className={isEmbedded ? "space-y-2" : "space-y-3"}>
      <div
        className={
          isEmbedded
            ? "flex flex-wrap items-center gap-x-4 gap-y-2"
            : fullWidth
              ? "space-y-2"
              : "flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-4"
        }
      >
        {labelHint}
        <div className={fullWidth ? "w-full" : undefined}>{segmentControl}</div>
      </div>

      {externalSelect}

      {error ? (
        <p className="text-xs text-danger" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
