import type { ReactNode } from "react";
import { InfoHint } from "./InfoHint";

type LabelVariant = "default" | "underline";

interface FormFieldShellProps {
  label: string;
  htmlFor?: string;
  hint?: ReactNode;
  error?: string;
  required?: boolean;
  labelVariant?: LabelVariant;
  children: ReactNode;
  className?: string;
}

export function FormFieldShell({
  label,
  htmlFor,
  hint,
  error,
  required,
  labelVariant = "default",
  children,
  className = "",
}: FormFieldShellProps) {
  const fieldId =
    htmlFor ?? label.toLowerCase().replace(/\s+/g, "-");
  const labelClass =
    labelVariant === "underline"
      ? "font-mono-tech text-[11px] uppercase tracking-[0.18em] text-muted"
      : "text-sm text-muted";

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <div className="flex items-center gap-1.5">
        <label htmlFor={fieldId} className={labelClass}>
          {label}
          {required ? (
            <span className="ml-0.5 text-danger" aria-hidden>
              *
            </span>
          ) : null}
        </label>
        {hint ? <InfoHint text={hint} label={label} /> : null}
      </div>
      {children}
      {error ? (
        <p id={`${fieldId}-error`} className="text-xs text-danger" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
