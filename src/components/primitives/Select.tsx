"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ChevronDown, Check, Search } from "lucide-react";
import { InfoHint } from "./InfoHint";
import {
  filterOptions,
  shouldShowSearch,
  sortOptions,
  type SelectOption,
} from "./select-utils";
import { trimInput } from "@/lib/text-trim";

interface SelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  label: string;
  id?: string;
  hint?: ReactNode;
  /** Force the search box on/off. Omit to auto-enable on large option sets. */
  searchable?: boolean;
  /** Keep the options in the order provided instead of sorting alphabetically. */
  preserveOrder?: boolean;
  /** Disable interaction — used when the option set is empty/irrelevant. */
  disabled?: boolean;
  /** Inline compact mode: hides the label row, slimmer trigger — for toolbars. */
  compact?: boolean;
}

export function Select({
  value,
  onChange,
  options,
  label,
  id,
  hint,
  searchable,
  preserveOrder,
  disabled,
  compact,
}: SelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
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

  const selected =
    ordered.find((o) => o.value === value) ?? ordered[0] ?? {
      value: "",
      label: "—",
    };

  // Reserve trigger width for the longest option so the control doesn't
  // resize (and nudge neighbours) when the selection changes.
  const triggerMinWidth = useMemo(() => {
    const longest = ordered.reduce(
      (max, o) => (o.label.length > max.length ? o.label : max),
      selected.label,
    );
    // ~0.55em per char + chevron(~1.25rem) + horizontal padding(~1.5rem)
    const ch = longest.length * 0.6 + 4;
    return `${ch}rem`;
  }, [ordered, selected.label]);

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

  return (
    <div className={compact ? "relative" : "flex flex-col gap-2"}>
      {compact ? null : (
        <div className="flex items-center gap-1.5">
          <label htmlFor={fieldId} className="text-sm text-muted">
            {label}
          </label>
          {hint ? <InfoHint text={hint} label={label} /> : null}
        </div>
      )}
      <div className="relative" ref={ref}>
        <button
          id={fieldId}
          type="button"
          disabled={disabled}
          aria-disabled={disabled}
          aria-label={compact ? label : undefined}
          title={compact ? label : undefined}
          onClick={() => (disabled ? null : open ? close() : setOpen(true))}
          aria-haspopup="listbox"
          aria-expanded={open}
          style={compact ? { minWidth: triggerMinWidth } : undefined}
          className={`focus-ring flex w-full items-center justify-between gap-2 rounded-[var(--radius-sm)] border bg-bg-elevated px-3 text-sm text-text transition-all duration-200 ${
            compact ? "min-h-9 py-1.5" : "min-h-11 py-2"
          } ${
            disabled
              ? "cursor-not-allowed border-border opacity-50"
              : open
                ? "cursor-pointer border-accent/50 shadow-[0_0_16px_var(--accent-glow)]"
                : "cursor-pointer border-border hover:border-border-strong"
          }`}
        >
          <span className="truncate">{selected.label}</span>
          <ChevronDown
            className={`h-4 w-4 shrink-0 text-accent/70 transition-transform duration-200 ${
              open ? "rotate-180" : ""
            } ${disabled ? "opacity-40" : ""}`}
            aria-hidden
          />
        </button>

        {open ? (
          <ul
            role="listbox"
            className="surface-elevated absolute z-50 mt-2 max-h-72 min-w-full w-max max-w-[min(90vw,20rem)] overflow-auto p-1 shadow-2xl"
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
                    onBlur={() => {
                      const trimmed = trimInput(query);
                      if (trimmed !== query) setQuery(trimmed);
                    }}
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
              const active = opt.value === value;
              return (
                <li key={opt.value} role="option" aria-selected={active}>
                  <button
                    type="button"
                    onClick={() => {
                      onChange(opt.value);
                      close();
                    }}
                    className={`flex w-full items-center justify-between gap-2 rounded-[var(--radius-sm)] px-3 py-2 text-left text-sm transition-colors ${
                      active
                        ? "bg-accent/10 text-accent"
                        : "text-text hover:bg-bg-surface-hover"
                    }`}
                  >
                    <span className="whitespace-nowrap">{opt.label}</span>
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
