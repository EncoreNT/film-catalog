import { access, stat } from "fs/promises";
import { computeFileHashPrefix } from "./file-hash";

export async function assertMovieFileReadable(filePath: string): Promise<void> {
  await access(filePath);
}

export async function readMovieFileMeta(filePath: string): Promise<{
  fileSize: number;
  fileMtime: Date;
  fileHash: string;
}> {
  const fileStat = await stat(filePath);
  const fileHash = await computeFileHashPrefix(filePath);
  return {
    fileSize: fileStat.size,
    fileMtime: fileStat.mtime,
    fileHash,
  };
}
