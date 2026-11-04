"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Check, Search } from "lucide-react";
import { InfoHint } from "./InfoHint";
import {
  filterOptions,
  shouldShowSearch,
  sortOptions,
  type SelectOption,
} from "./select-utils";
import { trimInput } from "@/lib/shared/text-trim";
import {
  clampBoxInContainer,
  FLOATING_GAP,
  FLOATING_VIEWPORT_PAD,
  viewportRect,
  resolveDialogPortalTarget,
} from "@/lib/ui/floating-position";

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

interface MenuCoords {
  top: number;
  left: number;
  minWidth: number;
  maxWidth: number;
  maxHeight: number;
}

const emptySubscribe = () => () => {};
const getMounted = () => true;
const getServerSnapshot = () => false;

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
  const [menuCoords, setMenuCoords] = useState<MenuCoords | null>(null);
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const fieldId = id ?? label.toLowerCase().replace(/\s+/g, "-");
  const mounted = useSyncExternalStore(
    emptySubscribe,
    getMounted,
    getServerSnapshot,
  );

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

  const close = useCallback(() => {
    setOpen(false);
    setQuery("");
    setMenuCoords(null);
    setPortalTarget(null);
  }, []);

  const updateMenuCoords = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const viewport = viewportRect();
    const maxWidth = Math.max(0, viewport.right - 2 * FLOATING_VIEWPORT_PAD);
    const minWidth = Math.min(rect.width, maxWidth);
    const list = listRef.current;
    const menu = menuRef.current;
    const width = Math.min(menu?.getBoundingClientRect().width ?? minWidth, maxWidth);
    // Measure natural content height, not the previously constrained height.
    const naturalHeight = menu && list
      ? menu.getBoundingClientRect().height - list.getBoundingClientRect().height + list.scrollHeight
      : 288;
    const desiredHeight = Math.min(naturalHeight, 288);
    const below = viewport.bottom - rect.bottom - FLOATING_GAP - FLOATING_VIEWPORT_PAD;
    const above = rect.top - FLOATING_GAP - FLOATING_VIEWPORT_PAD;
    const placeBelow = below >= desiredHeight || below >= above;
    const maxHeight = Math.max(0, Math.min(288, placeBelow ? below : above, viewport.bottom - 2 * FLOATING_VIEWPORT_PAD));
    const height = Math.min(desiredHeight, maxHeight);
    // Keep the menu attached to the trigger. Flip horizontal alignment before
    // using the viewport clamp, which is only a last-resort overflow guard.
    const left = rect.left + width > viewport.right - FLOATING_VIEWPORT_PAD
      ? rect.right - width
      : rect.left;
    const position = clampBoxInContainer(
      left,
      placeBelow ? rect.bottom + FLOATING_GAP : rect.top - FLOATING_GAP - height,
      width,
      height,
      viewport,
    );
    setMenuCoords({
      ...position,
      minWidth,
      maxWidth,
      maxHeight,
    });
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    const onLayoutChange = () => updateMenuCoords();
    window.addEventListener("scroll", onLayoutChange, true);
    window.addEventListener("resize", onLayoutChange);
    return () => {
      window.removeEventListener("scroll", onLayoutChange, true);
      window.removeEventListener("resize", onLayoutChange);
    };
  }, [open, updateMenuCoords]);

  // The portal mounts after its host is resolved. Reposition before paint
  // once the actual menu width is known, and when search changes its size.
  useLayoutEffect(() => {
    if (!open || !portalTarget) return;
    updateMenuCoords();
    const menu = menuRef.current;
    if (!menu) return;
    const observer = new ResizeObserver(updateMenuCoords);
    observer.observe(menu);
    if (listRef.current) observer.observe(listRef.current);
    return () => observer.disconnect();
  }, [open, portalTarget, filtered, updateMenuCoords]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (triggerRef.current?.contains(target)) return;
      if (menuRef.current?.contains(target)) return;
      close();
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
  }, [open, close]);

  const listbox = open && menuCoords ? (
    <div
      ref={menuRef}
      className="surface-elevated fixed z-[80] flex max-h-72 w-max max-w-[min(90vw,20rem)] flex-col overflow-hidden p-1 shadow-2xl"
      style={{
        top: menuCoords.top,
        left: menuCoords.left,
        minWidth: menuCoords.minWidth,
        maxWidth: menuCoords.maxWidth,
        maxHeight: menuCoords.maxHeight,
      }}
    >
      {showSearch ? (
        <div className="shrink-0 px-1 pb-2 pt-2">
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted/60"
              aria-hidden
            />
            <input
              autoFocus
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                if (listRef.current) listRef.current.scrollTop = 0;
              }}
              aria-label={`Поиск: ${label}`}
              onBlur={() => {
                const trimmed = trimInput(query);
                if (trimmed !== query) setQuery(trimmed);
              }}
              placeholder="Поиск…"
              className="focus-ring min-h-9 w-full rounded-[var(--radius-sm)] border border-border bg-bg-surface py-1.5 pl-8 pr-3 text-sm text-text placeholder:text-muted/60"
            />
          </div>
        </div>
      ) : null}
      <ul ref={listRef} role="listbox" aria-label={label} className="scroll-subtle min-h-0 overflow-auto overscroll-contain">
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
    </div>
  ) : null;

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
      <div className="relative" ref={triggerRef}>
        <button
          id={fieldId}
          type="button"
          disabled={disabled}
          aria-disabled={disabled}
          aria-label={compact ? label : undefined}
          title={compact ? label : undefined}
          onClick={() => {
            if (disabled) return;
            if (open) {
              close();
            } else {
              setPortalTarget(resolveDialogPortalTarget(triggerRef.current));
              updateMenuCoords();
              setOpen(true);
            }
          }}
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
      </div>

      {mounted && listbox && portalTarget
        ? createPortal(listbox, portalTarget)
        : null}
    </div>
  );
}
