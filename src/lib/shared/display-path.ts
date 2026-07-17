import path from "node:path";

function normalizeSlashes(value: string): string {
  return value.replace(/\\/g, "/").replace(/\/+/g, "/");
}

function normalizeWslRest(rest: string): string {
  return normalizeSlashes(rest).replace(/^\//, "");
}

/**
 * Converts WSL mount paths (/mnt/d/...) to Windows paths for display in the browser.
 * Windows paths are normalized via runtime round-trip to collapse duplicate separators.
 */
export function displayFilePath(filePath: string): string {
  if (!filePath) return filePath;

  const wslMatch = filePath.match(/^\/mnt\/([a-zA-Z])\/(.*)$/);
  if (wslMatch) {
    const drive = wslMatch[1].toUpperCase();
    const rest = normalizeWslRest(wslMatch[2]).replace(/\//g, "\\");
    return rest ? `${drive}:\\${rest}` : `${drive}:\\`;
  }

  if (/^[a-zA-Z]:[\\/]/.test(filePath)) {
    return displayFilePath(resolveRuntimePath(filePath));
  }

  return filePath;
}

/** Directory of a file path, in the same format as displayFilePath. */
export function displayFileDir(filePath: string): string {
  const display = displayFilePath(filePath);
  const lastBack = display.lastIndexOf("\\");
  const lastSlash = display.lastIndexOf("/");
  const lastSep = Math.max(lastBack, lastSlash);
  if (lastSep <= 0) return display;
  return display.slice(0, lastSep);
}

const WSL_MOUNT_RE = /^\/mnt\/([a-zA-Z])(?:\/(.*))?$/;
const WINDOWS_DRIVE_RE = /^([a-zA-Z]):[\\/](.*)$/;

function isWslMountInput(input: string): boolean {
  return WSL_MOUNT_RE.test(input.trim());
}

function isWindowsDriveInput(input: string): boolean {
  return WINDOWS_DRIVE_RE.test(input.trim());
}

/** Hint for file/directory path inputs (app runs on WSL, accepts Win or WSL paths). */
export const FILE_PATH_INPUT_HINT =
  "Абсолютный путь. Поддерживаются Windows (D:\\...) и WSL (/mnt/d/...) — формат определяется автоматически.";

/** Pick display form: preserve WSL if user typed WSL, Win if Win; runtime is always WSL. */
export function formatPathInputDisplay(input: string, runtime: string): string {
  const trimmed = input.trim();
  if (isWslMountInput(trimmed)) return runtime;
  if (isWindowsDriveInput(trimmed)) return displayFilePath(runtime);
  return runtime;
}

/**
 * Normalizes user input (Windows drive, WSL mount, or POSIX) to the runtime path
 * used by Node on WSL (/mnt/d/...). Non-WSL POSIX paths are returned trimmed.
 */
export function resolveRuntimePath(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return trimmed;

  const wslMatch = trimmed.match(WSL_MOUNT_RE);
  if (wslMatch) {
    const drive = wslMatch[1].toLowerCase();
    const rest = normalizeWslRest(wslMatch[2] ?? "");
    return rest ? `/mnt/${drive}/${rest}` : `/mnt/${drive}`;
  }

  const winMatch = trimmed.match(WINDOWS_DRIVE_RE);
  if (winMatch) {
    const drive = winMatch[1].toLowerCase();
    const rest = normalizeWslRest(winMatch[2]);
    return rest ? `/mnt/${drive}/${rest}` : `/mnt/${drive}`;
  }

  return normalizeSlashes(trimmed);
}

/** Join directory and filename using runtime path separators. */
export function joinRuntimePath(dir: string, file: string): string {
  const runtimeDir = resolveRuntimePath(dir).replace(/\/+$/, "");
  const basename = path.posix.basename(normalizeSlashes(file));
  return `${runtimeDir}/${basename}`;
}

const UNSAFE_FILENAME_CHARS = /[<>:"/\\|?*\x00-\x1f]/g;

/** Strip unsafe characters for export/build filenames. */
export function sanitizeFilename(name: string): string {
  const cleaned = name
    .replace(UNSAFE_FILENAME_CHARS, "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/[. ]+$/, "");
  return cleaned || "release.mkv";
}

/** Normalize user/file path input to runtime (WSL) form for fs access. */
export function normalizeFilePathInput(
  input: string | null | undefined,
): string | null {
  if (input == null) return null;
  const trimmed = input.trim();
  if (!trimmed) return null;
  return resolveRuntimePath(trimmed);
}

/** Format runtime or user path for display in inputs (Windows on WSL setups). */
export function formatFilePathInput(path: string | null | undefined): string {
  if (!path?.trim()) return "";
  return displayFilePath(path.trim());
}

/** On blur: normalize to runtime for storage; display keeps user's path format. */
export function commitFilePathInput(input: string): {
  runtime: string;
  display: string;
} {
  const trimmed = input.trim();
  const runtime = resolveRuntimePath(trimmed);
  return { runtime, display: formatPathInputDisplay(trimmed, runtime) };
}
