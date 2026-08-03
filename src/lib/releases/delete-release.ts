import { unlink } from "node:fs/promises";
import { access } from "node:fs/promises";
import { constants } from "node:fs";
import { prisma } from "@/lib/db/prisma";
import { deleteMovie } from "@/lib/movies/delete-movie";
import { findActiveExportForRelease } from "@/lib/releases/export-queue";
import {
  findActiveBuildForRelease,
  findActiveMoveForRelease,
} from "@/lib/releases/move-queue";
import { findReleaseForMovie } from "@/lib/releases/probe-release";

async function assertReleaseCanDelete(releaseId: number): Promise<void> {
  const [activeMove, activeExport, activeBuild] = await Promise.all([
    findActiveMoveForRelease(releaseId),
    findActiveExportForRelease(releaseId),
    findActiveBuildForRelease(releaseId),
  ]);

  if (activeMove) {
    throw new Error("Перемещение уже выполняется");
  }
  if (activeExport) {
    throw new Error("Дождитесь завершения экспорта");
  }
  if (activeBuild) {
    throw new Error("Релиз участвует в активной сборке");
  }
}

export interface DeleteReleaseResult {
  fileDeleted: boolean;
  fileMissing: boolean;
  /** True when the last release was removed and the movie row was deleted too. */
  movieDeleted: boolean;
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
  const isLastRelease = count <= 1;

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

  await assertReleaseCanDelete(releaseId);

  if (isLastRelease) {
    await prisma.$transaction(async (tx) => {
      await tx.releaseExport.deleteMany({ where: { releaseId } });
      await tx.releaseMove.deleteMany({ where: { releaseId } });
      await tx.movie.updateMany({
        where: { id: movieId, primaryReleaseId: releaseId },
        data: { primaryReleaseId: null },
      });
    });
    await deleteMovie(movieId);
    return { fileDeleted, fileMissing, movieDeleted: true, warning };
  }

  await prisma.$transaction(async (tx) => {
    await tx.releaseExport.deleteMany({ where: { releaseId } });
    await tx.releaseMove.deleteMany({ where: { releaseId } });
    await tx.movie.updateMany({
      where: { id: movieId, primaryReleaseId: releaseId },
      data: { primaryReleaseId: null },
    });
    await tx.release.delete({ where: { id: releaseId } });
  });

  return { fileDeleted, fileMissing, movieDeleted: false, warning };
}
