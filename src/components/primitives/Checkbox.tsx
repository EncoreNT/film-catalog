"use client";

import { Check } from "lucide-react";
import { type InputHTMLAttributes, type ReactNode, useId } from "react";

interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  children?: ReactNode;
}

/** Machined gold checkbox — pairs with {@link Radio} for form toggles. */
export function Checkbox({
  children,
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
      className={`group inline-flex cursor-pointer items-center gap-2.5 ${
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
        className="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[5px] border border-border-strong bg-bg-elevated shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition-all duration-200 group-hover:border-accent/50 peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent peer-checked:border-accent peer-checked:bg-accent/15 peer-checked:shadow-[0_0_12px_var(--accent-glow)] peer-disabled:group-hover:border-border-strong"
      >
        <Check
          className={`h-3 w-3 text-accent transition-all duration-150 ${
            checked ? "scale-100 opacity-100" : "scale-75 opacity-0"
          }`}
          strokeWidth={2.5}
          aria-hidden
        />
      </span>
      {children ? (
        <span className="min-w-0 text-sm leading-snug text-muted">{children}</span>
      ) : null}
    </label>
  );
}
