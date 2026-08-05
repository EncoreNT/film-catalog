import type { Stats } from "fs";

function isUsableFileTimestamp(date: Date): boolean {
  const ms = date.getTime();
  return Number.isFinite(ms) && ms > 0;
}

/** «Скачан»: дата появления файла на диске (birthtime), иначе mtime. */
export function fileDownloadedAtFromStat(
  stat: Pick<Stats, "birthtime" | "mtime">,
): Date {
  if (isUsableFileTimestamp(stat.birthtime)) {
    return stat.birthtime;
  }
  return stat.mtime;
}
