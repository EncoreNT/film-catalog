/**
 * Converts WSL mount paths (/mnt/d/...) to Windows paths for display in the browser.
 * Other paths are returned unchanged.
 */
export function displayFilePath(filePath: string): string {
  const match = filePath.match(/^\/mnt\/([a-zA-Z])\/(.*)$/);
  if (!match) return filePath;

  const drive = match[1].toUpperCase();
  const rest = match[2].replace(/\//g, "\\");
  return `${drive}:\\${rest}`;
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
