"use client";

import { useId, useState, type ReactNode } from "react";
import { InfoHint } from "./InfoHint";
import { trimInput } from "@/lib/shared/text-trim";
import {
  defaultDurationFormat,
  formatDurationField,
  parseDuration,
  type DurationFormat,
} from "@/lib/shared/duration";

interface DurationInputProps {
  /** Stored duration in seconds (source of truth). */
  valueSeconds: number | null;
  /** Emitted with parsed seconds when the current text is valid, else null. */
  onChange: (seconds: number | null) => void;
  label?: string;
  hint?: ReactNode;
}

const FORMATS: { id: DurationFormat; label: string; placeholder: string }[] = [
  { id: "hms", label: "чч:мм:сс", placeholder: "2:00:00" },
  { id: "minutes", label: "мин", placeholder: "120" },
  { id: "seconds", label: "сек", placeholder: "7200" },
];

export function DurationInput({
  valueSeconds,
  onChange,
  label = "Продолжительность",
  hint,
}: DurationInputProps) {
  const fieldId = useId();
  const [format, setFormat] = useState<DurationFormat>(defaultDurationFormat());
  const [text, setText] = useState(() => formatDurationField(format, valueSeconds));
  const [touched, setTouched] = useState(false);

  const active = FORMATS.find((f) => f.id === format)!;
  const { seconds, error } = parseDuration(format, text);
  const showError = touched && error != null;

  const handleText = (raw: string) => {
    setText(raw);
    const parsed = parseDuration(format, raw);
    onChange(parsed.seconds);
  };

  const handleBlur = () => {
    const trimmed = trimInput(text);
    if (trimmed !== text) handleText(trimmed);
    setTouched(true);
  };

  const handleFormat = (next: DurationFormat) => {
    // Re-render the same value in the new format (keeps valid values stable,
    // drops an in-progress invalid draft so the user starts clean).
    const carry = error == null ? seconds : valueSeconds;
    setFormat(next);
    setText(formatDurationField(next, carry));
    setTouched(false);
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
        className={`flex min-h-11 overflow-hidden rounded-[var(--radius)] border bg-bg-elevated transition-colors ${
          showError ? "border-danger/50" : "border-border"
        }`}
        role="group"
        aria-label={label}
      >
        <input
          id={fieldId}
          type="text"
          inputMode={format === "hms" ? "numeric" : "decimal"}
          value={text}
          onChange={(e) => handleText(e.target.value)}
          onBlur={handleBlur}
          placeholder={active.placeholder}
          aria-invalid={showError}
          aria-describedby={showError ? `${fieldId}-error` : undefined}
          className="focus-ring min-w-0 flex-1 border-0 bg-transparent px-3 py-2 font-mono-tech text-sm tabular-nums text-text placeholder:text-muted/60"
        />
        <div className="flex shrink-0 border-l border-border">
          {FORMATS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => handleFormat(f.id)}
              className={`focus-ring min-h-11 cursor-pointer px-3 text-xs font-medium transition-colors ${
                format === f.id
                  ? "bg-accent/15 text-accent"
                  : "text-muted hover:text-text"
              }`}
              aria-pressed={format === f.id}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>
      {showError ? (
        <p id={`${fieldId}-error`} className="text-xs text-danger" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
