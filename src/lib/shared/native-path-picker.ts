import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export class NativePickerCancelledError extends Error {
  constructor() {
    super("Выбор отменён");
    this.name = "NativePickerCancelledError";
  }
}

export type NativePickerKind = "directory" | "file";

function powershellPickerScript(kind: NativePickerKind): string {
  return [
    // WSL invokes Windows PowerShell; default OEM encoding corrupts Cyrillic paths.
    "[Console]::OutputEncoding = [System.Text.Encoding]::UTF8",
    "$OutputEncoding = [Console]::OutputEncoding",
    "Add-Type -AssemblyName System.Windows.Forms",
    ...(kind === "directory"
      ? [
          "$dialog = New-Object System.Windows.Forms.FolderBrowserDialog",
          "$dialog.Description = 'Выберите папку'",
        ]
      : [
          "$dialog = New-Object System.Windows.Forms.OpenFileDialog",
          "$dialog.Title = 'Выберите файл релиза'",
          "$dialog.CheckFileExists = $true",
          "$dialog.Multiselect = $false",
          "$dialog.Filter = 'Видеофайлы|*.mkv;*.mp4;*.avi;*.m2ts;*.ts;*.mov;*.webm;*.mpg;*.mpeg;*.wmv;*.vob|Все файлы|*.*'",
        ]),
    "if ($dialog.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK) {",
    kind === "directory"
      ? "  Write-Output $dialog.SelectedPath"
      : "  Write-Output $dialog.FileName",
    "}",
  ].join("; ");
}

/** Trim picker stdout and strip UTF-8 BOM if PowerShell emitted one. */
export function normalizePickerStdout(stdout: string): string {
  return stdout.replace(/^\uFEFF/, "").trim();
}

async function pickWithWindowsDialog(
  kind: NativePickerKind,
): Promise<string | null> {
  const command =
    process.platform === "win32"
      ? "powershell"
      : existsSync(
            "/mnt/c/Windows/System32/WindowsPowerShell/v1.0/powershell.exe",
          )
        ? "/mnt/c/Windows/System32/WindowsPowerShell/v1.0/powershell.exe"
        : null;

  if (!command) return null;

  const { stdout } = await execFileAsync(
    command,
    ["-NoProfile", "-STA", "-Command", powershellPickerScript(kind)],
    { timeout: 120_000, windowsHide: true, encoding: "utf8" },
  );

  const selected = normalizePickerStdout(stdout);
  if (!selected) throw new NativePickerCancelledError();
  return selected;
}

async function pickWithMacDialog(
  kind: NativePickerKind,
): Promise<string | null> {
  try {
    const { stdout } = await execFileAsync(
      "osascript",
      [
        "-e",
        kind === "directory"
          ? 'POSIX path of (choose folder with prompt "Выберите папку")'
          : 'POSIX path of (choose file with prompt "Выберите файл релиза")',
      ],
      { timeout: 120_000 },
    );
    const selected = stdout.trim();
    return selected || null;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("User canceled") || message.includes("-128")) {
      throw new NativePickerCancelledError();
    }
    throw err;
  }
}

async function pickWithZenity(kind: NativePickerKind): Promise<string | null> {
  try {
    const { stdout } = await execFileAsync(
      "zenity",
      [
        "--file-selection",
        ...(kind === "directory"
          ? ["--directory", "--title=Выберите папку"]
          : ["--title=Выберите файл релиза"]),
      ],
      { timeout: 120_000 },
    );
    const selected = stdout.trim();
    return selected || null;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (
      (err as { code?: number }).code === 1 ||
      message.includes("exit code 1") ||
      message.includes("Exit code: 1")
    ) {
      throw new NativePickerCancelledError();
    }
    throw err;
  }
}

/** Opens a native host dialog. Cancellation is distinct from an unavailable dialog. */
export async function pickPathNative(
  kind: NativePickerKind,
): Promise<string | null> {
  if (process.platform === "darwin") {
    return pickWithMacDialog(kind);
  }

  const windowsPath = await pickWithWindowsDialog(kind);
  if (windowsPath != null) return windowsPath;

  if (process.platform === "linux") {
    return pickWithZenity(kind);
  }

  return null;
}
