import { access, stat } from "fs/promises";
import { computeFileHashPrefix } from "@/lib/media/file-hash";
import { fileDownloadedAtFromStat } from "@/lib/shared/file-downloaded-at";

export async function assertMovieFileReadable(filePath: string): Promise<void> {
  await access(filePath);
}

export async function readMovieFileMeta(filePath: string): Promise<{
  fileSize: number;
  fileMtime: Date;
  fileDownloadedAt: Date;
  fileHash: string;
}> {
  const fileStat = await stat(filePath);
  const fileHash = await computeFileHashPrefix(filePath);
  return {
    fileSize: fileStat.size,
    fileMtime: fileStat.mtime,
    fileDownloadedAt: fileDownloadedAtFromStat(fileStat),
    fileHash,
  };
}
