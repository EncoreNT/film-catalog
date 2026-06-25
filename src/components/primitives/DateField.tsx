"use client";

import { useRef, type InputHTMLAttributes, type ReactNode } from "react";
import { Calendar } from "lucide-react";
import { InfoHint } from "./InfoHint";

interface DateFieldProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  label: string;
  error?: string;
  hint?: ReactNode;
}

export function DateField({
  label,
  error,
  hint,
  className = "",
  id,
  onClick,
  ...props
}: DateFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const fieldId = id ?? label.toLowerCase().replace(/\s+/g, "-");

  const openPicker = () => {
    try {
      inputRef.current?.showPicker();
    } catch {
      // showPicker() can throw SecurityError in some browsers/contexts;
      // the native focus + click fallback below still works for users.
    }
  };

  const handleClick: React.MouseEventHandler<HTMLLabelElement> = (e) => {
    openPicker();
    onClick?.(e as unknown as React.MouseEvent<HTMLInputElement>);
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-1.5">
        <label htmlFor={fieldId} className="text-sm text-muted">
          {label}
        </label>
        {hint ? <InfoHint text={hint} label={label} /> : null}
      </div>
      <label
        htmlFor={fieldId}
        onClick={handleClick}
        className="focus-ring flex min-h-11 w-full cursor-pointer items-center gap-2 rounded-[var(--radius)] border border-border bg-bg-elevated px-3 py-2 text-sm text-text transition-colors hover:border-border-strong"
      >
        <input
          ref={inputRef}
          id={fieldId}
          type="date"
          className={`date-field-input w-full bg-transparent text-sm text-text placeholder:text-muted/60 focus:outline-none ${className}`}
          aria-invalid={!!error}
          aria-describedby={error ? `${fieldId}-error` : undefined}
          {...props}
        />
        <Calendar
          className="h-4 w-4 shrink-0 text-muted transition-colors hover:text-accent"
          aria-hidden
        />
      </label>
      {error ? (
        <p id={`${fieldId}-error`} className="text-xs text-danger" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
