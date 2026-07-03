/** Split whole seconds into hours, minutes, and seconds components. */
export function secondsToHmsParts(seconds: number): {
  h: number;
  m: number;
  s: number;
} {
  const total = Math.round(seconds);
  return {
    h: Math.floor(total / 3600),
    m: Math.floor((total % 3600) / 60),
    s: total % 60,
  };
}
