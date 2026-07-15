/** Whether a non-empty file path should trigger an existence HEAD check. */
export function shouldCheckFilePath(path: string): boolean {
  return path.trim().length > 0;
}

export function buildFilePathHeadUrl(path: string): string {
  return `/api/movies?path=${encodeURIComponent(path)}`;
}

/** Maps HEAD response ok flag to catalog existence state. */
export function filePathExistsFromHead(ok: boolean): boolean {
  return ok;
}
