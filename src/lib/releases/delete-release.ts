import { unlink } from "node:fs/promises";
import { access } from "node:fs/promises";
import { constants } from "node:fs";
import { prisma } from "@/lib/db/prisma";
import { findReleaseForMovie } from "@/lib/releases/probe-release";

export interface DeleteReleaseResult {
  fileDeleted: boolean;
  fileMissing: boolean;
  warning?: string;
}

export async function deleteRelease(
  movieId: number,
  releaseId: number,
  options: { deleteFile?: boolean } = {},
): Promise<DeleteReleaseResult> {
  const release = await findReleaseForMovie(prisma, movieId, releaseId);
  if (!release) {
    throw new Error("Релиз не найден");
  }

  const count = await prisma.release.count({ where: { movieId } });
  if (count <= 1) {
    throw new Error("Нельзя удалить единственный релиз фильма");
  }

  let fileDeleted = false;
  let fileMissing = false;
  let warning: string | undefined;

  if (options.deleteFile && release.filePath) {
    try {
      await access(release.filePath, constants.F_OK);
      await unlink(release.filePath);
      fileDeleted = true;
    } catch {
      fileMissing = true;
      warning = "Файл на диске не найден, запись релиза будет удалена";
    }
  }

  await prisma.release.delete({ where: { id: releaseId } });

  return { fileDeleted, fileMissing, warning };
}
