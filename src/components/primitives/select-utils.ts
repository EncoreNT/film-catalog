export interface SelectOption {
  value: string;
  label: string;
}

/** Show the substring search box when a dropdown has at least this many options. */
export const SEARCH_THRESHOLD = 8;

/**
 * Options whose value is empty (e.g. the leading "—" placeholder) are pinned
 * to the top in their original order; the rest are sorted alphabetically by
 * label using a ru-aware, case-insensitive, numeric comparison.
 */
export function sortOptions<T extends SelectOption>(
  options: T[],
  preserveOrder = false,
): T[] {
  if (preserveOrder) return options;
  const placeholders = options.filter((o) => o.value === "");
  const rest = options.filter((o) => o.value !== "");
  const sorted = [...rest].sort((a, b) =>
    a.label.localeCompare(b.label, "ru", {
      sensitivity: "base",
      numeric: true,
    }),
  );
  return [...placeholders, ...sorted];
}

/** Case-insensitive substring match on the option label. */
export function filterOptions<T extends SelectOption>(
  options: T[],
  query: string,
): T[] {
  const q = query.trim().toLowerCase();
  if (!q) return options;
  return options.filter((o) => o.label.toLowerCase().includes(q));
}

/** Decide whether to render the search box given an explicit override. */
export function shouldShowSearch(
  optionCount: number,
  searchable?: boolean,
): boolean {
  if (searchable !== undefined) return searchable;
  return optionCount >= SEARCH_THRESHOLD;
}
