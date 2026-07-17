import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export class PickDirectoryCancelledError extends Error {
  constructor() {
    super("Выбор папки отменён");
    this.name = "PickDirectoryCancelledError";
  }
}

function powershellFolderPickerScript(): string {
  return [
    "Add-Type -AssemblyName System.Windows.Forms",
    "$dialog = New-Object System.Windows.Forms.FolderBrowserDialog",
    "$dialog.Description = 'Выберите папку'",
    "if ($dialog.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK) {",
    "  Write-Output $dialog.SelectedPath",
    "}",
  ].join("; ");
}

async function pickWithWindowsDialog(): Promise<string | null> {
  const command =
    process.platform === "win32"
      ? "powershell"
      : existsSync("/mnt/c/Windows/System32/WindowsPowerShell/v1.0/powershell.exe")
        ? "/mnt/c/Windows/System32/WindowsPowerShell/v1.0/powershell.exe"
        : null;

  if (!command) return null;

  const { stdout } = await execFileAsync(
    command,
    ["-NoProfile", "-STA", "-Command", powershellFolderPickerScript()],
    { timeout: 120_000, windowsHide: true },
  );

  const selected = stdout.trim();
  return selected || null;
}

async function pickWithMacDialog(): Promise<string | null> {
  try {
    const { stdout } = await execFileAsync(
      "osascript",
      ["-e", 'POSIX path of (choose folder with prompt "Выберите папку")'],
      { timeout: 120_000 },
    );
    const selected = stdout.trim();
    return selected || null;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("User canceled") || message.includes("-128")) {
      throw new PickDirectoryCancelledError();
    }
    throw err;
  }
}

async function pickWithZenity(): Promise<string | null> {
  try {
    const { stdout } = await execFileAsync(
      "zenity",
      ["--file-selection", "--directory", "--title=Выберите папку"],
      { timeout: 120_000 },
    );
    const selected = stdout.trim();
    return selected || null;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("exit code 1") || message.includes("Exit code: 1")) {
      throw new PickDirectoryCancelledError();
    }
    throw err;
  }
}

/** Opens a native folder picker on the host OS. Returns absolute path or null if unavailable. */
export async function pickDirectoryNative(): Promise<string | null> {
  if (process.platform === "darwin") {
    return pickWithMacDialog();
  }

  const windowsPath = await pickWithWindowsDialog();
  if (windowsPath != null) return windowsPath;

  if (process.platform === "linux") {
    return pickWithZenity();
  }

  return null;
}
