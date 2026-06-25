/**
 * Duration helpers with an explicit input format.
 *
 * The DurationInput exposes three formats; each parses its own text into
 * seconds and formats seconds back into that representation, so the stored
 * value (seconds) is the single source of truth and the field never needs a
 * free-form validator — switching format just re-renders the same value.
 */

export type DurationFormat = "hms" | "minutes" | "seconds";

interface ParseResult {
  seconds: number | null;
  /** Recovery hint shown when the text is non-empty but cannot be parsed. */
  error: string | null;
}

const HINTS: Record<DurationFormat, string> = {
  hms: "Введите время как чч:мм:сс, например 2:00:00.",
  minutes: "Введите целое число минут, например 120.",
  seconds: "Введите целое число секунд, например 7200.",
};

const SEP = /[.:]/;

function intOrNull(s: string): number | null {
  const trimmed = s.trim();
  if (trimmed === "" || !/^\d+$/.test(trimmed)) return null;
  return parseInt(trimmed, 10);
}

/** Parse text in the given format into whole seconds (or null + error). */
export function parseDuration(
  format: DurationFormat,
  input: string,
): ParseResult {
  const trimmed = input.trim();
  if (trimmed === "") return { seconds: null, error: null };

  if (format === "minutes" || format === "seconds") {
    const n = intOrNull(trimmed.replace(",", "."));
    if (n == null || n < 0) {
      return { seconds: null, error: HINTS[format] };
    }
    return {
      seconds: format === "minutes" ? n * 60 : n,
      error: null,
    };
  }

  // hms
  const parts = trimmed.split(SEP);
  if (parts.length < 2 || parts.length > 3) {
    return { seconds: null, error: HINTS.hms };
  }
  if (parts.some((p) => p.trim() === "")) {
    return { seconds: null, error: HINTS.hms };
  }
  const nums = parts.map(intOrNull);
  if (nums.some((n) => n == null || n < 0)) {
    return { seconds: null, error: HINTS.hms };
  }
  let h = 0;
  let m = 0;
  let s = 0;
  if (nums.length === 2) {
    [m, s] = nums as [number, number];
  } else {
    [h, m, s] = nums as [number, number, number];
  }
  if (m >= 60 || s >= 60) {
    return { seconds: null, error: "Минуты и секунды должны быть меньше 60." };
  }
  return { seconds: h * 3600 + m * 60 + s, error: null };
}

const pad2 = (n: number) => String(n).padStart(2, "0");

/** Format stored seconds into the given format's text representation. */
export function formatDuration(
  format: DurationFormat,
  seconds: number | null | undefined,
): string {
  if (seconds == null || seconds <= 0) return "";
  const total = Math.round(seconds);
  if (format === "seconds") return String(total);
  if (format === "minutes") return String(Math.round(total / 60));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return `${h}:${pad2(m)}:${pad2(s)}`;
}

/** Pick the most readable format for an initial value (hms for ≥1h, else minutes). */
export function defaultDurationFormat(
  seconds: number | null | undefined,
): DurationFormat {
  if (seconds == null || seconds <= 0) return "minutes";
  return seconds >= 3600 ? "hms" : "minutes";
}
