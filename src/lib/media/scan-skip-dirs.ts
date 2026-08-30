const SKIP_DIR_NAMES = new Set([
  "bdmv",
  "certificate",
  "clipinf",
  "playlist",
  "stream",
  "backup",
  "aacs",
]);

/** Directories the scanner must not recurse into (dot-dirs and Blu-ray trees). */
export function shouldSkipScanDir(name: string): boolean {
  if (name.startsWith(".")) return true;
  return SKIP_DIR_NAMES.has(name.toLowerCase());
}
