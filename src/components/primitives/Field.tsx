import { type InputHTMLAttributes, type ReactNode } from "react";
import { FormFieldShell } from "./FormFieldShell";
import { trimOnInputBlur, trimOnTextareaBlur } from "@/lib/shared/text-trim";

type FieldVariant = "filled" | "underline";

interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  /** Shown as a hover/focus "?" tooltip next to the label instead of below the field. */
  hint?: ReactNode;
  /** "filled" = solid bg-bg-elevated input (default). "underline" = transparent
   *  input read by LIGHT: a bottom hairline rest line + a gold gradient laser
   *  underline that scales in on focus, no filled box. Use for cinematic
   *  dialogs/forms where filled boxes read too heavy. */
  variant?: FieldVariant;
  children?: ReactNode;
}

/* Rest-state bottom hairline + focused gold laser underline for the underline
 *   variant. The rest line sits at the input's bottom edge; the focus line is a
 *   2px gold gradient that scales in from the left on peer-focus, mirroring the
 *   release-tab / reel-underline language. rgba() literals (not var()) for the
 *   glow — Tailwind v4 renders arbitrary box-shadow with var() unreliably.
 *
 *   The rest line uses a 35%-alpha lavender hairline (stronger than the 10%-alpha
 *   --border-hairline and the 20%-alpha --border-strong) so the field is clearly
 *   locatable over the grid background without focus; the boxy focus-ring outline
 *   is suppressed on the underline variant so the laser line is the sole, clean
 *   focus cue instead of a competing yellow rectangle. */
export function UnderlineLines({ error }: { error?: string }) {
  const focusLine = error
    ? "from-danger via-danger to-transparent shadow-[0_0_8px_rgba(248,113,113,0.45)]"
    : "from-accent-bright via-accent to-transparent shadow-[0_0_8px_rgba(232,176,90,0.45)]";
  return (
    <>
      <span
        aria-hidden
        className={`pointer-events-none absolute inset-x-0 bottom-0 h-px transition-colors duration-200 ${
          error ? "bg-danger/60" : "bg-[rgba(176,168,214,0.35)] peer-hover:bg-accent/55"
        }`}
      />
      <span
        aria-hidden
        className={`pointer-events-none absolute inset-x-0 bottom-0 h-[2px] origin-left scale-x-0 bg-gradient-to-r ${focusLine} transition-transform duration-300 ease-out peer-focus:scale-x-100`}
      />
    </>
  );
}

export function Field({
  label,
  error,
  hint,
  variant = "filled",
  className = "",
  id,
  children,
  required,
  onChange,
  onBlur,
  ...props
}: FieldProps) {
  const fieldId = id ?? label.toLowerCase().replace(/\s+/g, "-");
  const isUnderline = variant === "underline";

  return (
    <FormFieldShell
      label={label}
      htmlFor={fieldId}
      hint={hint}
      error={error}
      required={required}
      labelVariant={isUnderline ? "underline" : "default"}
    >
      {children ?? (
        isUnderline ? (
          <div className="relative">
            <input
              id={fieldId}
              className={`peer min-h-11 w-full border-0 bg-transparent px-0 py-2 text-sm text-text placeholder:text-muted/50 outline-none ${className}`}
              aria-invalid={!!error}
              aria-describedby={error ? `${fieldId}-error` : undefined}
              required={required}
              onChange={onChange}
              onBlur={(e) => trimOnInputBlur(e, onChange, onBlur)}
              {...props}
            />
            <UnderlineLines error={error} />
          </div>
        ) : (
          <input
            id={fieldId}
            className={`focus-ring min-h-11 w-full rounded-[var(--radius)] border border-border bg-bg-elevated px-3 py-2 text-sm text-text placeholder:text-muted/60 ${className}`}
            aria-invalid={!!error}
            aria-describedby={error ? `${fieldId}-error` : undefined}
            required={required}
            onChange={onChange}
            onBlur={(e) => trimOnInputBlur(e, onChange, onBlur)}
            {...props}
          />
        )
      )}
    </FormFieldShell>
  );
}

interface TextAreaFieldProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  error?: string;
  hint?: ReactNode;
  variant?: FieldVariant;
}

export function TextAreaField({
  label,
  error,
  hint,
  variant = "filled",
  className = "",
  id,
  onChange,
  onBlur,
  ...props
}: TextAreaFieldProps) {
  const fieldId = id ?? label.toLowerCase().replace(/\s+/g, "-");
  const isUnderline = variant === "underline";

  return (
    <FormFieldShell
      label={label}
      htmlFor={fieldId}
      hint={hint}
      error={error}
      labelVariant={isUnderline ? "underline" : "default"}
    >
      {isUnderline ? (
        <div className="relative">
          <textarea
            id={fieldId}
            className={`peer min-h-28 w-full resize-y border-0 bg-transparent px-0 py-2 text-sm text-text placeholder:text-muted/50 outline-none ${className}`}
            aria-invalid={!!error}
            onChange={onChange}
            onBlur={(e) => trimOnTextareaBlur(e, onChange, onBlur)}
            {...props}
          />
          <UnderlineLines error={error} />
        </div>
      ) : (
        <textarea
          id={fieldId}
          className={`focus-ring min-h-28 w-full rounded-[var(--radius)] border border-border bg-bg-elevated px-3 py-2 text-sm text-text placeholder:text-muted/60 ${className}`}
          aria-invalid={!!error}
          onChange={onChange}
          onBlur={(e) => trimOnTextareaBlur(e, onChange, onBlur)}
          {...props}
        />
      )}
    </FormFieldShell>
  );
}
