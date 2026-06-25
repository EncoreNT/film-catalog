import { type InputHTMLAttributes, type ReactNode } from "react";
import { InfoHint } from "./InfoHint";

interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  /** Shown as a hover/focus "?" tooltip next to the label instead of below the field. */
  hint?: ReactNode;
  children?: ReactNode;
}

export function Field({
  label,
  error,
  hint,
  className = "",
  id,
  children,
  required,
  ...props
}: FieldProps) {
  const fieldId = id ?? label.toLowerCase().replace(/\s+/g, "-");

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-1.5">
        <label htmlFor={fieldId} className="text-sm text-muted">
          {label}
          {required ? <span className="ml-0.5 text-danger" aria-hidden>*</span> : null}
        </label>
        {hint ? <InfoHint text={hint} label={label} /> : null}
      </div>
      {children ?? (
        <input
          id={fieldId}
          className={`focus-ring min-h-11 w-full rounded-[var(--radius)] border border-border bg-bg-elevated px-3 py-2 text-sm text-text placeholder:text-muted/60 ${className}`}
          aria-invalid={!!error}
          aria-describedby={error ? `${fieldId}-error` : undefined}
          required={required}
          {...props}
        />
      )}
      {error ? (
        <p id={`${fieldId}-error`} className="text-xs text-danger" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

interface TextAreaFieldProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  error?: string;
  hint?: ReactNode;
}

export function TextAreaField({
  label,
  error,
  hint,
  className = "",
  id,
  ...props
}: TextAreaFieldProps) {
  const fieldId = id ?? label.toLowerCase().replace(/\s+/g, "-");
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-1.5">
        <label htmlFor={fieldId} className="text-sm text-muted">
          {label}
        </label>
        {hint ? <InfoHint text={hint} label={label} /> : null}
      </div>
      <textarea
        id={fieldId}
        className={`focus-ring min-h-28 w-full rounded-[var(--radius)] border border-border bg-bg-elevated px-3 py-2 text-sm text-text placeholder:text-muted/60 ${className}`}
        aria-invalid={!!error}
        {...props}
      />
      {error ? (
        <p className="text-xs text-danger" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
