"use client";

import {
  useCallback,
  useEffect,
  useRef,
  type ReactNode,
} from "react";
import { Loader2, Plus, Search } from "lucide-react";
import { trimInput } from "@/lib/shared/text-trim";

export interface CreatableComboboxItem {
  id: string | number;
  label: string;
  /** Optional trailing meta (e.g. release count). */
  meta?: ReactNode;
  /** When true, row is highlighted as selected. */
  selected?: boolean;
}

interface CreatableComboboxProps {
  open: boolean;
  query: string;
  onQueryChange: (value: string) => void;
  items: CreatableComboboxItem[];
  onSelect: (item: CreatableComboboxItem) => void;
  loading?: boolean;
  disabled?: boolean;
  placeholder?: string;
  emptyMessage?: string;
  /** Show «Создать «query»» row when query is non-empty and not duplicate. */
  canCreate?: boolean;
  creating?: boolean;
  onCreate?: (name: string) => void;
  /** Leading icon for each list row. */
  itemIcon?: ReactNode;
  /** Icon for the create row (defaults to Plus). */
  createIcon?: ReactNode;
  className?: string;
  searchInputClassName?: string;
  inputRef?: React.RefObject<HTMLInputElement | null>;
}

export function CreatableCombobox({
  open,
  query,
  onQueryChange,
  items,
  onSelect,
  loading = false,
  disabled = false,
  placeholder = "Поиск или создание…",
  emptyMessage = "Ничего не найдено",
  canCreate = false,
  creating = false,
  onCreate,
  itemIcon,
  createIcon,
  className = "surface-elevated scroll-subtle absolute z-50 mt-1 max-h-64 min-w-full w-[max(100%,min(100vw-2rem,16rem))] overflow-auto p-1 shadow-2xl",
  searchInputClassName = "focus-ring min-h-8 w-full rounded-[var(--radius-sm)] border border-border bg-bg-surface py-1 pl-8 pr-3 text-sm text-text placeholder:text-muted/60",
  inputRef: externalInputRef,
}: CreatableComboboxProps) {
  const internalRef = useRef<HTMLInputElement>(null);
  const inputRef = externalInputRef ?? internalRef;
  const trimmedQuery = query.trim();

  const focusInput = useCallback(() => {
    setTimeout(() => inputRef.current?.focus(), 40);
  }, [inputRef]);

  useEffect(() => {
    if (open) focusInput();
  }, [open, focusInput]);

  if (!open) return null;

  const showEmpty = items.length === 0 && !canCreate;

  return (
    <div role="listbox" className={className}>
      <div className="px-1 pb-1 pt-1">
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted/60"
            aria-hidden
          />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            onBlur={() => {
              const trimmed = trimInput(query);
              if (trimmed !== query) onQueryChange(trimmed);
            }}
            placeholder={placeholder}
            disabled={disabled}
            className={searchInputClassName}
          />
          {loading ? (
            <Loader2
              className="absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 animate-spin text-accent/70"
              aria-hidden
            />
          ) : null}
        </div>
      </div>

      {showEmpty ? (
        <p className="px-3 py-2 text-sm text-muted">
          {trimmedQuery ? emptyMessage : emptyMessage}
        </p>
      ) : null}

      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          role="option"
          aria-selected={item.selected ?? false}
          disabled={disabled || creating}
          onClick={() => onSelect(item)}
          className={`flex w-full items-center gap-2 rounded-[var(--radius-sm)] px-3 py-1.5 text-left text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
            item.selected
              ? "bg-accent/15 text-accent"
              : "text-text hover:bg-bg-surface-hover"
          }`}
        >
          {itemIcon}
          <span className="min-w-0 flex-1 truncate">{item.label}</span>
          {item.meta}
        </button>
      ))}

      {canCreate && onCreate ? (
        <button
          type="button"
          role="option"
          aria-selected={false}
          disabled={disabled || creating}
          onClick={() => onCreate(trimmedQuery)}
          className="mt-0.5 flex w-full items-center gap-2 rounded-[var(--radius-sm)] border border-accent/30 bg-accent/10 px-3 py-1.5 text-left text-sm text-accent transition-colors hover:bg-accent/20 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {createIcon ?? <Plus className="h-3.5 w-3.5 shrink-0" aria-hidden />}
          <span className="truncate">Создать «{trimmedQuery}»</span>
          {creating ? (
            <Loader2
              className="ml-auto h-3.5 w-3.5 shrink-0 animate-spin"
              aria-hidden
            />
          ) : null}
        </button>
      ) : null}
    </div>
  );
}
