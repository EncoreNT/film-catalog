import type { ChangeEvent, FocusEvent } from "react";

/** Trim leading/trailing whitespace on single-line inputs. */
export function trimInput(value: string): string {
  return value.trim();
}

/**
 * Trim outer whitespace and remove blank lines at the start and end
 * (lines that contain only whitespace).
 */
export function trimMultiline(value: string): string {
  const lines = value.split(/\r?\n/);
  let start = 0;
  let end = lines.length;
  while (start < end && lines[start].trim() === "") start++;
  while (end > start && lines[end - 1].trim() === "") end--;
  return lines.slice(start, end).join("\n");
}

export function trimInputOptional(
  value: string | null | undefined,
): string | null {
  if (value == null) return null;
  const trimmed = trimInput(value);
  return trimmed === "" ? null : trimmed;
}

export function trimMultilineOptional(
  value: string | null | undefined,
): string | null {
  if (value == null) return null;
  const trimmed = trimMultiline(value);
  return trimmed === "" ? null : trimmed;
}

export function trimOnInputBlur(
  e: FocusEvent<HTMLInputElement>,
  onChange?: (event: ChangeEvent<HTMLInputElement>) => void,
  onBlur?: (event: FocusEvent<HTMLInputElement>) => void,
): void {
  const trimmed = trimInput(e.target.value);
  if (trimmed !== e.target.value && onChange) {
    onChange({
      ...e,
      target: { ...e.target, value: trimmed },
      currentTarget: { ...e.currentTarget, value: trimmed },
    } as ChangeEvent<HTMLInputElement>);
  }
  onBlur?.(e);
}

export function trimOnTextareaBlur(
  e: FocusEvent<HTMLTextAreaElement>,
  onChange?: (event: ChangeEvent<HTMLTextAreaElement>) => void,
  onBlur?: (event: FocusEvent<HTMLTextAreaElement>) => void,
): void {
  const trimmed = trimMultiline(e.target.value);
  if (trimmed !== e.target.value && onChange) {
    onChange({
      ...e,
      target: { ...e.target, value: trimmed },
      currentTarget: { ...e.currentTarget, value: trimmed },
    } as ChangeEvent<HTMLTextAreaElement>);
  }
  onBlur?.(e);
}
