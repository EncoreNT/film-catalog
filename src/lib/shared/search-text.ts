/** Lowercase text for case-insensitive search (Russian-aware). */
export function normalizeSearchText(value: string): string {
  return value.trim().toLocaleLowerCase("ru");
}

/** Case-insensitive substring match for UI search fields. */
export function searchTextIncludes(haystack: string, needle: string): boolean {
  const normalizedNeedle = normalizeSearchText(needle);
  if (!normalizedNeedle) return true;
  return normalizeSearchText(haystack).includes(normalizedNeedle);
}

/** Case-insensitive equality for deduping search/create actions. */
export function searchTextEquals(a: string, b: string): boolean {
  return normalizeSearchText(a) === normalizeSearchText(b);
}
