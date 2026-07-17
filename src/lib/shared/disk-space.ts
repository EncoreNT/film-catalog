import { statfs } from "node:fs/promises";
import path from "node:path";
import { resolveRuntimePath } from "@/lib/shared/display-path";
import type { DiskSpaceInfo } from "@/lib/shared/disk-space-types";

export type { DiskSpaceInfo } from "@/lib/shared/disk-space-types";

export async function getDiskSpaceForPath(
  inputPath: string,
): Promise<DiskSpaceInfo | null> {
  const runtimePath = resolveRuntimePath(inputPath);
  const dir = runtimePath.endsWith("/")
    ? runtimePath.slice(0, -1)
    : path.extname(runtimePath)
      ? path.posix.dirname(runtimePath.replace(/\\/g, "/"))
      : runtimePath;

  try {
    const stats = await statfs(dir);
    return {
      path: dir,
      totalBytes: Number(stats.bsize) * Number(stats.blocks),
      freeBytes: Number(stats.bsize) * Number(stats.bfree),
    };
  } catch {
    return null;
  }
}
