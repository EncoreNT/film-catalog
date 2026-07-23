import { getDiskSpaceForPath } from "@/lib/shared/disk-space";
import { formatArchiveTotalSize, formatFileSizeGB } from "@/lib/shared/format";

export async function assertTargetDirFits(
  targetDir: string,
  requiredBytes: number | null | undefined,
): Promise<void> {
  if (requiredBytes == null || requiredBytes <= 0) return;

  const info = await getDiskSpaceForPath(targetDir);
  if (!info) return;

  if (requiredBytes > info.freeBytes) {
    const need = formatFileSizeGB(requiredBytes) ?? "—";
    const free = formatArchiveTotalSize(info.freeBytes) ?? "—";
    throw new Error(`Недостаточно места на диске: нужно ${need}, свободно ${free}`);
  }
}
