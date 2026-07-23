/**
 * Text normalization strategies.
 *
 * - `normalizeSearchText` — UI combobox/search (locale lower, no NFC)
 * - `normalizeMatchKeyTitle` — matchKey / DB search (NFC + lower + whitespace)
 */

/** Lowercase text for case-insensitive UI search (Russian-aware). */
export function normalizeSearchText(value: string): string {
  return value.trim().toLocaleLowerCase("ru");
}

/** NFC + Unicode-aware lowercasing for title/matchKey/catalog search. */
export function normalizeMatchKeyTitle(title: string): string {
  return title.normalize("NFC").toLowerCase().replace(/\s+/g, " ").trim();
}

/** Normalized query needle for case-insensitive catalog search via matchKey. */
export function normalizeSearchQuery(q: string): string {
  return normalizeMatchKeyTitle(q);
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

/** Title comparison for build track mapping (same as search text). */
export function normalizeComparableTitle(
  value: string | null | undefined,
): string | null {
  if (value == null) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return normalizeSearchText(trimmed);
}
