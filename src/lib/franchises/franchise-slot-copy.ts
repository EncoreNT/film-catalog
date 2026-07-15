/** Neutral copy for empty franchise slots — series/slot state, not user intent. */

export const FRANCHISE_SLOT_MISSING_HEADLINE = "Не добавлен";
export const FRANCHISE_SLOT_FUTURE_HEADLINE = "Ещё не вышел";

export const FRANCHISE_SLOT_MISSING_ARIA = "фильм не добавлен";
export const FRANCHISE_SLOT_FUTURE_ARIA = "ещё не вышел";

export const FRANCHISE_SLOT_MISSING_FOOTER = "пока не в архиве";

export function franchiseSlotFutureFooter(
  year?: number | null,
  isUnreleased?: boolean,
): string {
  if (year != null) return `релиз · ${year}`;
  if (isUnreleased) return "ещё не вышел";
  return "будущий релиз";
}

export function franchiseSlotAriaLabel(
  isFuture: boolean,
  title: string,
  year?: number | null,
): string {
  const yearPart = year != null ? `, ${year}` : "";
  return isFuture
    ? `${FRANCHISE_SLOT_FUTURE_HEADLINE}: ${title}${yearPart}`
    : `${FRANCHISE_SLOT_MISSING_FOOTER}: ${title}`;
}
