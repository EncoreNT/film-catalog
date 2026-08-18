import { execFile } from "node:child_process";
import { mkdir, readFile } from "node:fs/promises";
import { promisify } from "node:util";
import { resolveRuntimePath } from "@/lib/shared/display-path";

const execFileAsync = promisify(execFile);

export type WslDriveRef = {
  letter: string;
  mountPoint: string;
};

export type MountEntry = {
  mountPoint: string;
  fsType: string;
  source: string;
  superOptions: string;
};

export type WslDriveMountStatus =
  | { kind: "not-windows-drive" }
  | { kind: "mounted"; drive: WslDriveRef }
  | { kind: "unmounted"; drive: WslDriveRef };

const WSL_DRIVE_PATH_RE = /^\/mnt\/([a-z])(?=\/|$)/;

export function detectWsl(procVersion: string): boolean {
  return /microsoft|wsl/i.test(procVersion);
}

export function wslDriveFromPath(input: string): WslDriveRef | null {
  const runtime = resolveRuntimePath(input);
  const match = runtime.match(WSL_DRIVE_PATH_RE);
  if (!match) return null;
  const letter = match[1].toUpperCase();
  return { letter, mountPoint: `/mnt/${match[1]}` };
}

function unescapeMountField(value: string): string {
  return value.replace(/\\([0-7]{3})/g, (_, oct: string) =>
    String.fromCharCode(Number.parseInt(oct, 8)),
  );
}

export function parseProcMountinfo(text: string): MountEntry[] {
  const entries: MountEntry[] = [];
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const sep = trimmed.indexOf(" - ");
    if (sep < 0) continue;
    const left = trimmed.slice(0, sep).split(" ");
    const right = trimmed.slice(sep + 3).split(" ");
    if (left.length < 5 || right.length < 2) continue;
    entries.push({
      mountPoint: unescapeMountField(left[4]),
      fsType: right[0],
      source: unescapeMountField(right[1]),
      superOptions: right.slice(2).join(" "),
    });
  }
  return entries;
}

function isPathInsideMount(path: string, mountPoint: string): boolean {
  if (mountPoint === "/") return true;
  return path === mountPoint || path.startsWith(`${mountPoint}/`);
}

export function coveringMount(
  mounts: MountEntry[],
  path: string,
): MountEntry | null {
  const runtime = resolveRuntimePath(path);
  let best: MountEntry | null = null;
  for (const entry of mounts) {
    if (!isPathInsideMount(runtime, entry.mountPoint)) continue;
    if (!best || entry.mountPoint.length > best.mountPoint.length) {
      best = entry;
    }
  }
  return best;
}

export function isWslWindowsDriveFs(entry: MountEntry): boolean {
  const fsType = entry.fsType.toLowerCase();
  if (fsType === "drvfs") return true;
  if (fsType !== "9p") return false;
  return (
    /drvfs/i.test(entry.superOptions) ||
    /drvfs/i.test(entry.source) ||
    /^[a-zA-Z]:\\?$/.test(entry.source)
  );
}

export function inspectWslDriveMount(
  input: string,
  mounts: MountEntry[],
): WslDriveMountStatus {
  const drive = wslDriveFromPath(input);
  if (!drive) return { kind: "not-windows-drive" };

  const covering = coveringMount(mounts, drive.mountPoint);
  if (
    covering &&
    covering.mountPoint === drive.mountPoint &&
    isWslWindowsDriveFs(covering)
  ) {
    return { kind: "mounted", drive };
  }
  return { kind: "unmounted", drive };
}

export function wslDriveUnmountedMessage(letter: string): string {
  return `Диск ${letter.toUpperCase()}: не смонтирован в WSL`;
}

export function suggestedWslDriveMountCommand(letter: string): string {
  const upper = letter.toUpperCase();
  const mountPoint = `/mnt/${upper.toLowerCase()}`;
  return `sudo mkdir -p ${mountPoint} && sudo mount -t drvfs ${upper}: ${mountPoint}`;
}

export function wslDriveMountAttempts(
  letter: string,
): { file: string; args: string[] }[] {
  const upper = letter.toUpperCase();
  const mountPoint = `/mnt/${upper.toLowerCase()}`;
  const win = `${upper}:`;
  return [
    { file: "mount", args: [mountPoint] },
    { file: "mount", args: ["-t", "drvfs", win, mountPoint] },
    { file: "sudo", args: ["-n", "mount", "-t", "drvfs", win, mountPoint] },
  ];
}

export function wslDriveMountFailedMessage(letter: string): string {
  return `Не удалось подключить диск ${letter.toUpperCase()}:. Выполните в терминале: ${suggestedWslDriveMountCommand(letter)}`;
}

export class WslDriveUnmountedError extends Error {
  readonly drive: WslDriveRef;

  constructor(drive: WslDriveRef) {
    super(wslDriveUnmountedMessage(drive.letter));
    this.name = "WslDriveUnmountedError";
    this.drive = drive;
  }
}

export async function isHostWsl(): Promise<boolean> {
  try {
    const version = await readFile("/proc/version", "utf8");
    return detectWsl(version);
  } catch {
    return false;
  }
}

export async function readHostMounts(): Promise<MountEntry[]> {
  const text = await readFile("/proc/self/mountinfo", "utf8");
  return parseProcMountinfo(text);
}

export async function inspectHostWslDrive(
  path: string,
): Promise<WslDriveMountStatus> {
  if (!(await isHostWsl())) return { kind: "not-windows-drive" };
  let mounts: MountEntry[] = [];
  try {
    mounts = await readHostMounts();
  } catch {
    mounts = [];
  }
  return inspectWslDriveMount(path, mounts);
}

export async function assertWslDriveMounted(path: string): Promise<void> {
  const status = await inspectHostWslDrive(path);
  if (status.kind === "unmounted") {
    throw new WslDriveUnmountedError(status.drive);
  }
}

export async function mountWslDrive(path: string): Promise<WslDriveRef> {
  const drive = wslDriveFromPath(path);
  if (!drive) {
    throw new Error("Укажите путь на Windows-диске (F:\\... или /mnt/f/...)");
  }
  if (!(await isHostWsl())) {
    throw new Error("Подключение Windows-диска доступно только в WSL");
  }

  const already = await inspectHostWslDrive(path);
  if (already.kind === "mounted") return drive;

  await mkdir(drive.mountPoint, { recursive: true }).catch(() => undefined);

  for (const attempt of wslDriveMountAttempts(drive.letter)) {
    try {
      await execFileAsync(attempt.file, attempt.args, { timeout: 15_000 });
    } catch {
      // Try the next strategy; the final error is user-facing.
    }
    const after = await inspectHostWslDrive(path);
    if (after.kind === "mounted") return drive;
  }

  throw new Error(wslDriveMountFailedMessage(drive.letter));
}
