"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Calendar, ChevronLeft, ChevronRight, X } from "lucide-react";
import {
  MONTHS_RU,
  WEEKDAYS_SHORT_RU,
  addMonths,
  buildMonthGrid,
  formatDisplayDate,
  isSameDay,
  parseISODate,
  startOfDay,
  toISODate,
} from "@/lib/calendar";

interface DatePickerProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  hint?: ReactNode;
}

export function DatePicker({
  label,
  value,
  onChange,
  error,
  hint,
}: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const [viewDate, setViewDate] = useState<Date>(() => {
    const parsed = parseISODate(value);
    return parsed ?? startOfDay(new Date());
  });
  const [focusedIso, setFocusedIso] = useState<string>(() => {
    const parsed = parseISODate(value);
    return parsed ? toISODate(parsed) : toISODate(startOfDay(new Date()));
  });

  const containerRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const fieldId = label.toLowerCase().replace(/\s+/g, "-");

  const openPicker = useCallback(() => {
    const parsed = parseISODate(value);
    const base = parsed ?? startOfDay(new Date());
    setViewDate(new Date(base.getFullYear(), base.getMonth(), 1));
    setFocusedIso(toISODate(base));
    setOpen(true);
  }, [value]);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  const days = useMemo(() => buildMonthGrid(viewDate), [viewDate]);

  const pick = (iso: string) => {
    onChange(iso);
    setOpen(false);
  };

  const clear = () => {
    onChange("");
    setOpen(false);
  };

  const goToday = () => {
    const today = startOfDay(new Date());
    setViewDate(new Date(today.getFullYear(), today.getMonth(), 1));
    setFocusedIso(toISODate(today));
    pick(toISODate(today));
  };

  const moveFocus = (deltaDays: number) => {
    const current = parseISODate(focusedIso) ?? startOfDay(new Date());
    const next = new Date(current);
    next.setDate(current.getDate() + deltaDays);
    setFocusedIso(toISODate(next));
    if (next.getMonth() !== viewDate.getMonth() || next.getFullYear() !== viewDate.getFullYear()) {
      setViewDate(new Date(next.getFullYear(), next.getMonth(), 1));
    }
  };

  const handleGridKey = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case "ArrowRight":
        e.preventDefault();
        moveFocus(1);
        break;
      case "ArrowLeft":
        e.preventDefault();
        moveFocus(-1);
        break;
      case "ArrowDown":
        e.preventDefault();
        moveFocus(7);
        break;
      case "ArrowUp":
        e.preventDefault();
        moveFocus(-7);
        break;
      case "Enter":
      case " ":
        e.preventDefault();
        pick(focusedIso);
        break;
      case "PageUp":
        e.preventDefault();
        setViewDate((d) => addMonths(d, -1));
        break;
      case "PageDown":
        e.preventDefault();
        setViewDate((d) => addMonths(d, 1));
        break;
    }
  };

  const display = value ? formatDisplayDate(value) : "";
  const selectedDate = parseISODate(value);

  return (
    <div ref={containerRef} className="relative flex flex-col gap-2">
      <div className="flex items-center gap-1.5">
        <label htmlFor={fieldId} className="text-sm text-muted">
          {label}
        </label>
        {hint ? (
          <span className="font-mono-tech text-[0.65rem] text-faint">
            {hint}
          </span>
        ) : null}
      </div>

      <button
        type="button"
        id={fieldId}
        onClick={() => (open ? setOpen(false) : openPicker())}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-describedby={error ? `${fieldId}-error` : undefined}
        className={`focus-ring flex min-h-11 w-full cursor-pointer items-center gap-2 rounded-[var(--radius)] border bg-bg-elevated px-3 py-2 text-left text-sm transition-all duration-200 ${
          open
            ? "border-accent/50 shadow-[0_0_20px_var(--accent-glow)]"
            : "border-border hover:border-border-strong"
        } ${value ? "text-text" : "text-muted"}`}
      >
        <Calendar className="h-4 w-4 shrink-0 text-accent/80" aria-hidden />
        <span className={`flex-1 ${value ? "" : "text-faint"}`}>
          {value ? display : "дата не выбрана"}
        </span>
        {value ? (
          <span
            role="button"
            tabIndex={-1}
            onClick={(e) => {
              e.stopPropagation();
              clear();
            }}
            className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-muted transition-colors hover:text-danger"
            aria-label="Очистить дату"
          >
            <X className="h-3.5 w-3.5" aria-hidden />
          </span>
        ) : null}
      </button>

      {open ? (
        <div
          role="dialog"
          aria-label={`${label} — выбор даты`}
          className="surface-elevated absolute left-0 top-full z-50 mt-2 w-[19rem] p-4 shadow-[0_24px_60px_rgba(0,0,0,0.6)]"
        >
          <div className="mb-3 flex items-center justify-between">
            <span className="font-mono-tech text-sm text-text">
              {MONTHS_RU[viewDate.getMonth()]} {viewDate.getFullYear()}
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setViewDate((d) => addMonths(d, -1))}
                className="focus-ring flex h-7 w-7 cursor-pointer items-center justify-center rounded-md text-muted transition-colors hover:bg-bg-surface-hover hover:text-accent"
                aria-label="Предыдущий месяц"
              >
                <ChevronLeft className="h-4 w-4" aria-hidden />
              </button>
              <button
                type="button"
                onClick={() => setViewDate((d) => addMonths(d, 1))}
                className="focus-ring flex h-7 w-7 cursor-pointer items-center justify-center rounded-md text-muted transition-colors hover:bg-bg-surface-hover hover:text-accent"
                aria-label="Следующий месяц"
              >
                <ChevronRight className="h-4 w-4" aria-hidden />
              </button>
            </div>
          </div>

          <div className="font-mono-tech mb-1 grid grid-cols-7 text-center text-[0.6rem] text-faint">
            {WEEKDAYS_SHORT_RU.map((d) => (
              <span key={d}>{d}</span>
            ))}
          </div>

          <div
            ref={gridRef}
            tabIndex={0}
            onKeyDown={handleGridKey}
            className="grid grid-cols-7 gap-1 outline-none"
          >
            {days.map((cell) => {
              const isSelected =
                selectedDate != null && isSameDay(cell.date, selectedDate);
              const isFocused = cell.iso === focusedIso;
              return (
                <button
                  key={cell.iso}
                  type="button"
                  disabled={!cell.inMonth}
                  onClick={() => pick(cell.iso)}
                  onFocus={() => setFocusedIso(cell.iso)}
                  onMouseEnter={() => setFocusedIso(cell.iso)}
                  className={`relative flex h-8 w-full items-center justify-center rounded-md text-xs transition-all duration-150 ${
                    !cell.inMonth
                      ? "cursor-default text-faint/40"
                      : "cursor-pointer text-text hover:bg-bg-surface-hover"
                  } ${
                    cell.inMonth && cell.isToday && !isSelected
                      ? "font-mono-tech text-accent/90 ring-1 ring-inset ring-accent/30"
                      : ""
                  } ${
                    isSelected
                      ? "bg-accent font-semibold text-bg-deep shadow-[0_0_14px_var(--accent-glow)]"
                      : ""
                  } ${
                    isFocused && !isSelected
                      ? "ring-1 ring-inset ring-accent/50"
                      : ""
                  }`}
                  aria-label={cell.iso}
                  aria-pressed={isSelected}
                >
                  {cell.day}
                </button>
              );
            })}
          </div>

          <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
            <button
              type="button"
              onClick={clear}
              className="font-mono-tech cursor-pointer rounded-md px-2 py-1 text-[0.65rem] text-muted transition-colors hover:text-danger"
            >
              очистить
            </button>
            <button
              type="button"
              onClick={goToday}
              className="font-mono-tech cursor-pointer rounded-md border border-accent/30 bg-accent/10 px-2.5 py-1 text-[0.65rem] text-accent transition-colors hover:bg-accent/20"
            >
              сегодня
            </button>
          </div>
        </div>
      ) : null}

      {error ? (
        <p id={`${fieldId}-error`} className="text-xs text-danger" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
