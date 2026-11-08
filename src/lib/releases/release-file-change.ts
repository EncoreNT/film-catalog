import { normalizeFilePathInput } from "@/lib/shared/display-path";

/** Compare filenames, not locations, against the file that supplied the current tracks. */
export function hasReleaseFilenameChanged(
  tracksFilePath: string | null | undefined,
  currentFilePath: string | null | undefined,
): boolean {
  const filename = (value: string | null | undefined) => {
    if (/[\\/]$/.test(value?.trim() ?? "")) return "";
    const runtime = normalizeFilePathInput(value);
    if (runtime && /^\/mnt\/[a-z]$/i.test(runtime)) return "";
    return runtime?.split("/").at(-1)?.normalize("NFC").toLowerCase() ?? "";
  };
  const previous = filename(tracksFilePath);
  const current = filename(currentFilePath);
  return !!previous && !!current && previous !== current;
}
