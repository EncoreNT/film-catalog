"use client";

import { useId, useState, type ReactNode } from "react";
import { Minus, Plus } from "lucide-react";
import { InfoHint } from "./InfoHint";

const MIN_YEAR = 1888;
/** Latest accepted release year (allow upcoming releases). */
const MAX_YEAR = new Date().getFullYear() + 1;

interface YearInputProps {
  /** Stored year (source of truth). */
  value: number | null;
  onChange: (year: number | null) => void;
  label?: string;
  hint?: ReactNode;
}

function clampYear(n: number): number {
  return Math.min(MAX_YEAR, Math.max(MIN_YEAR, n));
}

export function YearInput({
  value,
  onChange,
  label = "Год",
  hint,
}: YearInputProps) {
  const fieldId = useId();
  const [text, setText] = useState(() => (value != null ? String(value) : ""));
  const [error, setError] = useState<string | null>(null);

  const canDecrement = value == null || value > MIN_YEAR;
  const canIncrement = value == null || value < MAX_YEAR;

  const commit = (raw: string) => {
    const digits = raw.replace(/[^\d]/g, "").slice(0, 4);
    setText(digits);
    if (digits === "") {
      setError(null);
      onChange(null);
      return;
    }
    const n = parseInt(digits, 10);
    if (n < MIN_YEAR || n > MAX_YEAR) {
      setError(`Год должен быть от ${MIN_YEAR} до ${MAX_YEAR}.`);
      // Still emit the clamped value so submit can't store an out-of-range year,
      // but keep the user's text so they can fix it.
      onChange(clampYear(n));
      return;
    }
    setError(null);
    onChange(n);
  };

  const step = (delta: number) => {
    const base = value ?? new Date().getFullYear();
    const next = clampYear(base + delta);
    setText(String(next));
    setError(null);
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
      <div
        className={`flex min-h-11 items-center gap-1 rounded-[var(--radius)] border bg-bg-elevated px-1.5 py-1 transition-all duration-200 ${
          value != null
            ? "border-accent/40 shadow-[0_0_16px_var(--accent-glow)]"
            : "border-border hover:border-border-strong"
        } ${error ? "!border-danger/50" : ""}`}
        role="group"
        aria-label={label}
      >
        <button
          type="button"
          onClick={() => step(-1)}
          disabled={!canDecrement}
          aria-label="Предыдущий год"
          className="focus-ring flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-[var(--radius-sm)] text-muted transition-colors hover:bg-bg-surface-hover hover:text-accent disabled:cursor-not-allowed disabled:opacity-30"
        >
          <Minus className="h-4 w-4" aria-hidden />
        </button>

        <input
          id={fieldId}
          type="text"
          inputMode="numeric"
          value={text}
          onChange={(e) => commit(e.target.value)}
          onBlur={() => {
            if (text !== "" && value != null) setText(String(value));
          }}
          placeholder="1994"
          maxLength={4}
          aria-invalid={error != null}
          aria-describedby={error ? `${fieldId}-error` : undefined}
          className="focus-ring min-w-0 flex-1 border-0 bg-transparent px-1 py-1 text-center font-mono-tech text-base font-semibold text-text placeholder:text-muted/60"
        />

        <button
          type="button"
          onClick={() => step(1)}
          disabled={!canIncrement}
          aria-label="Следующий год"
          className="focus-ring flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-[var(--radius-sm)] text-muted transition-colors hover:bg-bg-surface-hover hover:text-accent disabled:cursor-not-allowed disabled:opacity-30"
        >
          <Plus className="h-4 w-4" aria-hidden />
        </button>
      </div>
      {error ? (
        <p id={`${fieldId}-error`} className="text-xs text-danger" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
