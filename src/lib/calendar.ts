export const WEEKDAYS_SHORT_RU = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

export const MONTHS_RU = [
  "Январь",
  "Февраль",
  "Март",
  "Апрель",
  "Май",
  "Июнь",
  "Июль",
  "Август",
  "Сентябрь",
  "Октябрь",
  "Ноябрь",
  "Декабрь",
];

export interface CalendarDay {
  date: Date;
  day: number;
  inMonth: boolean;
  isToday: boolean;
  iso: string;
}

/** Monday-first index (0..6) for a date. */
export function weekdayIndex(date: Date): number {
  const jsDay = date.getDay();
  return jsDay === 0 ? 6 : jsDay - 1;
}

export function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function toISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function parseISODate(value: string): Date | null {
  if (!value) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const [, y, m, d] = match;
  const date = new Date(Number(y), Number(m) - 1, Number(d));
  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * Build a 6-row grid (42 cells) of days for the month containing `viewDate`,
 * padded with trailing/leading days from adjacent months. Monday-first.
 */
export function buildMonthGrid(viewDate: Date): CalendarDay[] {
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstOfMonth = new Date(year, month, 1);
  const today = startOfDay(new Date());
  const leading = weekdayIndex(firstOfMonth);
  const start = new Date(year, month, 1 - leading);

  const cells: CalendarDay[] = [];
  for (let i = 0; i < 42; i++) {
    const date = new Date(start);
    date.setDate(start.getDate() + i);
    cells.push({
      date,
      day: date.getDate(),
      inMonth: date.getMonth() === month,
      isToday: isSameDay(date, today),
      iso: toISODate(date),
    });
  }
  return cells;
}

export function addMonths(date: Date, count: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + count, 1);
}

/** ru-RU display: «25.06.2026». */
export function formatDisplayDate(value: string): string {
  const date = parseISODate(value);
  if (!date) return "";
  return date.toLocaleDateString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}
