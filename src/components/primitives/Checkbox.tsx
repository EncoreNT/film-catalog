"use client";

import { type InputHTMLAttributes, useId } from "react";
import { Check } from "lucide-react";

interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  label: string;
}

export function Checkbox({
  label,
  className = "",
  id,
  checked,
  disabled,
  ...props
}: CheckboxProps) {
  const autoId = useId();
  const fieldId = id ?? autoId;

  return (
    <label
      htmlFor={fieldId}
      className={`group inline-flex cursor-pointer items-center gap-2.5 text-sm text-muted transition-colors hover:text-text ${
        disabled ? "cursor-not-allowed opacity-40" : ""
      } ${className}`}
    >
      <input
        id={fieldId}
        type="checkbox"
        checked={checked}
        disabled={disabled}
        className="peer sr-only"
        {...props}
      />
      <span
        aria-hidden
        className="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[var(--radius-sm)] border border-border-strong bg-bg-elevated transition-all duration-200 group-hover:border-accent/50 peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent peer-checked:border-accent peer-checked:bg-accent peer-checked:shadow-[0_0_12px_var(--accent-glow)] peer-disabled:group-hover:border-border-strong"
      >
        <Check
          className={`h-3 w-3 text-on-accent transition-opacity duration-150 ${
            checked ? "opacity-100" : "opacity-0"
          }`}
          strokeWidth={3}
          aria-hidden
        />
      </span>
      {label}
    </label>
  );
}
