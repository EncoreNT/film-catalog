"use client";

import { type InputHTMLAttributes, type ReactNode, useId } from "react";

interface RadioProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  children?: ReactNode;
}

export function Radio({
  children,
  className = "",
  id,
  checked,
  disabled,
  ...props
}: RadioProps) {
  const autoId = useId();
  const fieldId = id ?? autoId;

  return (
    <label
      htmlFor={fieldId}
      className={`group inline-flex cursor-pointer items-start gap-2.5 ${
        disabled ? "cursor-not-allowed opacity-40" : ""
      } ${className}`}
    >
      <input
        id={fieldId}
        type="radio"
        checked={checked}
        disabled={disabled}
        className="peer sr-only"
        {...props}
      />
      <span
        aria-hidden
        className="mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border border-border-strong bg-bg-elevated transition-all duration-200 group-hover:border-accent/50 peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent peer-checked:border-accent peer-checked:bg-accent/15 peer-checked:shadow-[0_0_12px_var(--accent-glow)] peer-disabled:group-hover:border-border-strong"
      >
        <span
          className={`h-2 w-2 rounded-full bg-accent transition-all duration-150 ${
            checked ? "scale-100 opacity-100" : "scale-0 opacity-0"
          }`}
        />
      </span>
      {children ? (
        <span className="min-w-0 text-sm leading-snug text-text">{children}</span>
      ) : null}
    </label>
  );
}
