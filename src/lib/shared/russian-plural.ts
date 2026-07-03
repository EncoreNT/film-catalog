export function pluralRu(
  count: number,
  one: string,
  few: string,
  many: string,
): string {
  const abs = Math.abs(count);
  const mod10 = abs % 10;
  const mod100 = abs % 100;

  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
  return many;
}

/** Format a count with the correct Russian plural form, e.g. "3 фильма". */
export function formatCountRu(
  count: number,
  forms: [one: string, few: string, many: string],
): string {
  return `${count} ${pluralRu(count, ...forms)}`;
}
