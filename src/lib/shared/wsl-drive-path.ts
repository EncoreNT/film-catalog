import { resolveRuntimePath } from "@/lib/shared/display-path";

export type WslDriveRef = {
  letter: string;
  mountPoint: string;
};

const WSL_DRIVE_PATH_RE = /^\/mnt\/([a-z])(?=\/|$)/;

export function wslDriveFromPath(input: string): WslDriveRef | null {
  const runtime = resolveRuntimePath(input);
  const match = runtime.match(WSL_DRIVE_PATH_RE);
  if (!match) return null;
  const letter = match[1].toUpperCase();
  return { letter, mountPoint: `/mnt/${match[1]}` };
}
