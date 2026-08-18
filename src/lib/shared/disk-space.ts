import { statfs } from "node:fs/promises";
import path from "node:path";
import { resolveRuntimePath } from "@/lib/shared/display-path";
import type { DiskSpaceInfo } from "@/lib/shared/disk-space-types";
import {
  inspectHostWslDrive,
  type WslDriveRef,
} from "@/lib/shared/wsl-drive-mount";

export type { DiskSpaceInfo } from "@/lib/shared/disk-space-types";

export type DiskSpaceLookup =
  | { kind: "ok"; info: DiskSpaceInfo }
  | { kind: "unmounted"; drive: WslDriveRef; path: string }
  | { kind: "unavailable"; path: string };

function diskSpaceDir(inputPath: string): string {
  const runtimePath = resolveRuntimePath(inputPath);
  return runtimePath.endsWith("/")
    ? runtimePath.slice(0, -1)
    : path.extname(runtimePath)
      ? path.posix.dirname(runtimePath.replace(/\\/g, "/"))
      : runtimePath;
}

export async function lookupDiskSpaceForPath(
  inputPath: string,
): Promise<DiskSpaceLookup> {
  const dir = diskSpaceDir(inputPath);
  const mount = await inspectHostWslDrive(dir);
  if (mount.kind === "unmounted") {
    return { kind: "unmounted", drive: mount.drive, path: dir };
  }

  try {
    const stats = await statfs(dir);
    return {
      kind: "ok",
      info: {
        path: dir,
        totalBytes: Number(stats.bsize) * Number(stats.blocks),
        freeBytes: Number(stats.bsize) * Number(stats.bfree),
      },
    };
  } catch {
    return { kind: "unavailable", path: dir };
  }
}

export async function getDiskSpaceForPath(
  inputPath: string,
): Promise<DiskSpaceInfo | null> {
  const lookup = await lookupDiskSpaceForPath(inputPath);
  return lookup.kind === "ok" ? lookup.info : null;
}
