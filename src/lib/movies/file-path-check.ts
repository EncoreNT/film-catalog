import { normalizeFilePathInput } from "@/lib/shared/display-path";

/** Whether a non-empty file path should trigger an existence HEAD check. */
export function shouldCheckFilePath(path: string): boolean {
  return path.trim().length > 0;
}

export function buildFilePathHeadUrl(path: string): string {
  const runtime = normalizeFilePathInput(path) ?? path.trim();
  return `/api/movies?path=${encodeURIComponent(runtime)}`;
}

/** Maps HEAD response ok flag to catalog existence state. */
export function filePathExistsFromHead(ok: boolean): boolean {
  return ok;
}
