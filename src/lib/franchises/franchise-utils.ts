export function countFilledSlots(
  slots: { movieId: number | null }[],
): number {
  return slots.filter((s) => s.movieId != null).length;
}

export function countTotalSlots(slots: { movieId: number | null }[]): number {
  return slots.length;
}
