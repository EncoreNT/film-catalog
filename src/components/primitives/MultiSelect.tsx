"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ChevronDown, Check, GripVertical, Search, X } from "lucide-react";
import { InfoHint } from "./InfoHint";
import {
  filterOptions,
  shouldShowSearch,
  sortOptions,
  type SelectOption,
} from "./select-utils";

interface MultiSelectProps {
  value: string[];
  onChange: (value: string[]) => void;
  options: SelectOption[];
  label: string;
  placeholder?: string;
  id?: string;
  /** Force the search box on/off. Omit to auto-enable on large option sets. */
  searchable?: boolean;
  /** Keep the options in the order provided instead of sorting alphabetically. */
  preserveOrder?: boolean;
  /** Allow drag-and-drop reordering of selected tags (order is reflected in `value`). */
  reorderable?: boolean;
  hint?: ReactNode;
}

export function MultiSelect({
  value,
  onChange,
  options,
  label,
  placeholder = "—",
  id,
  searchable,
  preserveOrder,
  reorderable,
  hint,
}: MultiSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const fieldId = id ?? label.toLowerCase().replace(/\s+/g, "-");

  const ordered = useMemo(
    () => sortOptions(options, preserveOrder),
    [options, preserveOrder],
  );
  const showSearch = shouldShowSearch(ordered.length, searchable);
  const filtered = useMemo(
    () => (showSearch ? filterOptions(ordered, query) : ordered),
    [ordered, query, showSearch],
  );

  const selectedEntries = value.map((val) => ({
    value: val,
    label: ordered.find((o) => o.value === val)?.label ?? val,
  }));

  const close = () => {
    setOpen(false);
    setQuery("");
  };

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        close();
      }
    };
    const esc = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("mousedown", handler);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);

  const toggle = (val: string) => {
    onChange(
      value.includes(val)
        ? value.filter((v) => v !== val)
        : [...value, val],
    );
    setQuery("");
  };

  const removeTag = (val: string) => {
    onChange(value.filter((v) => v !== val));
  };

  const moveTag = (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex || toIndex < 0 || toIndex >= value.length) return;
    const next = [...value];
    const [item] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, item);
    onChange(next);
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-1.5">
        <label htmlFor={fieldId} className="text-sm text-muted">
          {label}
        </label>
        {hint ? <InfoHint text={hint} label={label} /> : null}
      </div>
      <div className="relative" ref={ref}>
        <div
          id={fieldId}
          role="combobox"
          aria-haspopup="listbox"
          aria-expanded={open}
          tabIndex={0}
          onClick={() => (open ? close() : setOpen(true))}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              if (open) close();
              else setOpen(true);
            }
          }}
          className={`focus-ring flex min-h-11 w-full cursor-pointer items-center justify-between gap-2 rounded-[var(--radius-sm)] border bg-bg-elevated px-3 py-2 text-sm text-text transition-all duration-200 ${
            open
              ? "border-accent/50 shadow-[0_0_16px_var(--accent-glow)]"
              : "border-border hover:border-border-strong"
          }`}
        >
          <span className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
            {selectedEntries.length > 0 ? (
              selectedEntries.map(({ value: val, label: tagLabel }, index) => (
                <span
                  key={val}
                  draggable={reorderable}
                  onDragStart={(e) => {
                    if (!reorderable) return;
                    setDragIndex(index);
                    e.dataTransfer.effectAllowed = "move";
                  }}
                  onDragOver={(e) => {
                    if (!reorderable || dragIndex === null) return;
                    e.preventDefault();
                    e.dataTransfer.dropEffect = "move";
                  }}
                  onDrop={(e) => {
                    if (!reorderable || dragIndex === null) return;
                    e.preventDefault();
                    moveTag(dragIndex, index);
                    setDragIndex(null);
                  }}
                  onDragEnd={() => setDragIndex(null)}
                  className={`font-mono-tech inline-flex max-w-full items-center gap-0.5 rounded-full border border-border-strong bg-bg-surface py-0.5 text-xs text-text ${
                    reorderable ? "cursor-grab pl-1 pr-1 active:cursor-grabbing" : "pl-2 pr-1"
                  } ${dragIndex === index ? "opacity-60" : ""}`}
                >
                  {reorderable ? (
                    <GripVertical
                      className="h-3 w-3 shrink-0 text-muted/70"
                      aria-hidden
                    />
                  ) : null}
                  <span className="truncate">{tagLabel}</span>
                  <button
                    type="button"
                    aria-label={`Убрать ${tagLabel}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      removeTag(val);
                    }}
                    className="focus-ring shrink-0 rounded-full p-0.5 text-muted transition-colors hover:text-danger"
                  >
                    <X className="h-3 w-3" aria-hidden />
                  </button>
                </span>
              ))
            ) : (
              <span className="text-muted">{placeholder}</span>
            )}
          </span>
          <ChevronDown
            className={`h-4 w-4 shrink-0 text-accent/70 transition-transform duration-200 ${
              open ? "rotate-180" : ""
            }`}
            aria-hidden
          />
        </div>

        {open ? (
          <ul
            role="listbox"
            aria-multiselectable
            className="surface-elevated absolute z-50 mt-2 max-h-72 w-full overflow-auto p-1 shadow-2xl"
          >
            {showSearch ? (
              <li className="px-1 pb-1 pt-2">
                <div className="relative">
                  <Search
                    className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted/60"
                    aria-hidden
                  />
                  <input
                    autoFocus
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Поиск…"
                    className="focus-ring min-h-9 w-full rounded-[var(--radius-sm)] border border-border bg-bg-surface py-1.5 pl-8 pr-3 text-sm text-text placeholder:text-muted/60"
                  />
                </div>
              </li>
            ) : null}
            {filtered.length === 0 ? (
              <li className="px-3 py-2 text-sm text-muted">Ничего не найдено</li>
            ) : null}
            {filtered.map((opt) => {
              const active = value.includes(opt.value);
              return (
                <li key={opt.value} role="option" aria-selected={active}>
                  <button
                    type="button"
                    onClick={() => toggle(opt.value)}
                    className={`flex w-full items-center justify-between gap-2 rounded-[var(--radius-sm)] px-3 py-2 text-left text-sm transition-colors ${
                      active
                        ? "bg-accent/10 text-accent"
                        : "text-text hover:bg-bg-surface-hover"
                    }`}
                  >
                    <span className="truncate">{opt.label}</span>
                    {active ? (
                      <Check className="h-4 w-4 shrink-0 text-accent" aria-hidden />
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ul>
        ) : null}
      </div>
    </div>
  );
}
