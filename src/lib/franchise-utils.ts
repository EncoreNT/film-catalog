export function countFilledSlots(
  slots: { movieId: number | null }[],
): number {
  return slots.filter((s) => s.movieId != null).length;
}

export function countTotalSlots(slots: { movieId: number | null }[]): number {
  return slots.length;
}

export function pluralFilms(n: number): string {
  const mod100 = n % 100;
  const mod10 = n % 10;
  if (mod100 >= 11 && mod100 <= 19) return "фильмов";
  if (mod10 === 1) return "фильм";
  if (mod10 >= 2 && mod10 <= 4) return "фильма";
  return "фильмов";
}
