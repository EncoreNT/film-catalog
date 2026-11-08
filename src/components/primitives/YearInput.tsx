"use client";

import {
  useEffect,
  useLayoutEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { InfoHint } from "./InfoHint";
import "./year-input.css";

export const MIN_YEAR = 1888;
/** Latest accepted release year for planned franchise slots. */
export const MAX_YEAR = new Date().getFullYear() + 1;

export function clampYear(n: number): number {
  return Math.min(MAX_YEAR, Math.max(MIN_YEAR, n));
}

interface YearInputProps {
  value: number | null;
  onChange: (year: number | null) => void;
  label?: string;
  hint?: ReactNode;
  id?: string;
  minYear?: number;
  maxYear?: number;
}

export function YearInput({
  value,
  onChange,
  label = "Год",
  hint,
  id,
  minYear = MIN_YEAR,
  maxYear = MAX_YEAR,
}: YearInputProps) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  const triggerRef = useRef<HTMLButtonElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [decade, setDecade] = useState(
    () => Math.floor((value ?? new Date().getFullYear()) / 10) * 10,
  );
  const firstDecade = Math.floor(minYear / 10) * 10;
  const lastDecade = Math.floor(maxYear / 10) * 10;
  const invalid = value != null && (value < minYear || value > maxYear);
  const error = invalid ? `Введите год от ${minYear} до ${maxYear}` : "";
  const decades = Array.from(
    { length: (lastDecade - firstDecade) / 10 + 1 },
    (_, i) => firstDecade + i * 10,
  );
  const choose = (year: number | null) => {
    onChange(year);
    setOpen(false);
    triggerRef.current?.focus();
  };

  useEffect(() => {
    if (!open) return;
    const dismiss = (event: Event) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", dismiss);
    document.addEventListener("focusin", dismiss);
    return () => {
      document.removeEventListener("pointerdown", dismiss);
      document.removeEventListener("focusin", dismiss);
    };
  }, [open]);

  useLayoutEffect(() => {
    if (!open) return;
    const position = () => {
      const root = rootRef.current;
      const panel = panelRef.current;
      if (!root || !panel) return;
      const bounds = root.getBoundingClientRect();
      const viewport = window.visualViewport;
      const viewportTop = viewport?.offsetTop ?? 0;
      const viewportBottom =
        viewportTop + (viewport?.height ?? window.innerHeight);
      const below = viewportBottom - bounds.bottom - 20;
      const above = bounds.top - viewportTop - 20;
      const upward = below < panel.scrollHeight && above > below;
      panel.dataset.side = upward ? "top" : "bottom";
      panel.style.maxHeight = `${Math.max(80, upward ? above : below)}px`;
    };
    position();
    window.addEventListener("resize", position);
    window.addEventListener("scroll", position, true);
    window.visualViewport?.addEventListener("resize", position);
    return () => {
      window.removeEventListener("resize", position);
      window.removeEventListener("scroll", position, true);
      window.visualViewport?.removeEventListener("resize", position);
    };
  }, [open, decade]);

  return (
    <div
      ref={rootRef}
      className="year-picker"
      onKeyDown={(event) => {
        if (event.key === "Escape" && open) {
          event.preventDefault();
          setOpen(false);
          triggerRef.current?.focus();
        }
      }}
    >
      <div className="year-picker-label">
        <label htmlFor={fieldId}>{label}</label>
        {hint ? <InfoHint text={hint} label={label} /> : null}
      </div>
      <div className="year-picker-control" data-invalid={invalid}>
        <CalendarDays size={19} aria-hidden />
        <input
          id={fieldId}
          ref={(node) => {
            node?.setCustomValidity(error);
          }}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          maxLength={4}
          pattern="[0-9]{4}"
          value={value ?? ""}
          placeholder="Год"
          aria-invalid={invalid}
          aria-describedby={invalid ? `${fieldId}-error` : undefined}
          onChange={(event) => {
            const raw = event.target.value;
            if (!/^\d{0,4}$/.test(raw)) return;
            onChange(raw === "" ? null : Number(raw));
          }}
        />
        <button
          ref={triggerRef}
          type="button"
          className="focus-ring"
          aria-label="Выбрать год"
          aria-expanded={open}
          aria-controls={`${fieldId}-choices`}
          onClick={() => {
            if (!open)
              setDecade(
                Math.floor(
                  Math.min(
                    maxYear,
                    Math.max(minYear, value ?? new Date().getFullYear()),
                  ) / 10,
                ) * 10,
              );
            setOpen(!open);
          }}
        >
          <ChevronDown size={18} aria-hidden />
        </button>
      </div>
      {invalid && (
        <p id={`${fieldId}-error`} className="year-picker-error" role="alert">
          {error}
        </p>
      )}
      {open && (
        <div
          ref={panelRef}
          id={`${fieldId}-choices`}
          className="year-picker-panel"
          role="group"
          aria-label="Выбор года"
        >
          <div className="year-picker-navigation">
            <button
              type="button"
              className="focus-ring"
              aria-label="Предыдущее десятилетие"
              disabled={decade <= firstDecade}
              onClick={() => setDecade(decade - 10)}
            >
              <ChevronLeft size={18} aria-hidden />
            </button>
            <select
              aria-label="Десятилетие"
              value={decade}
              onChange={(event) => setDecade(Number(event.target.value))}
              className="focus-ring"
            >
              {decades.map((start) => (
                <option key={start} value={start}>
                  {Math.max(minYear, start)}–{Math.min(maxYear, start + 9)}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="focus-ring"
              aria-label="Следующее десятилетие"
              disabled={decade >= lastDecade}
              onClick={() => setDecade(decade + 10)}
            >
              <ChevronRight size={18} aria-hidden />
            </button>
          </div>
          <div className="year-picker-years">
            {Array.from({ length: 10 }, (_, i) => decade + i)
              .filter((year) => year >= minYear && year <= maxYear)
              .map((year) => (
                <button
                  key={year}
                  type="button"
                  className="focus-ring"
                  aria-pressed={value === year}
                  onClick={() => choose(year)}
                >
                  {year}
                </button>
              ))}
          </div>
          <div className="year-picker-footer">
            <button
              type="button"
              className="focus-ring"
              onClick={() => choose(null)}
            >
              Без года
            </button>
            <button
              type="button"
              className="focus-ring"
              onClick={() => {
                setOpen(false);
                triggerRef.current?.focus();
              }}
            >
              Готово
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
