import { unlink } from "node:fs/promises";
import path from "node:path";
import type { PrismaClient } from "@/generated/prisma/client";
import { prisma } from "@/lib/db/prisma";
import { dataPath } from "@/lib/db/data-path";
import { isCoverImageExtension } from "./cover-formats";
import { posterMetadataStore } from "./poster-metadata";

type CoverDb = Pick<PrismaClient, "movie" | "franchise">;

/** Call under withCoverMutation after committing coverPath, never inside a DB transaction. */
export async function cleanupUnreferencedCovers(
  candidates: (string | null | undefined)[],
  db: CoverDb = prisma,
): Promise<string[]> {
  const removed: string[] = [];
  const normalized = candidates.map((candidate) => candidate ? path.posix.normalize(candidate.replaceAll("\\", "/")) : null);
  for (const candidate of new Set(normalized)) {
    if (!candidate?.startsWith("covers/")) continue;
    const filename = candidate.slice(7);
    if (filename !== path.basename(filename) || filename.includes("\\") ||
        !isCoverImageExtension(path.extname(filename))) continue;
    try {
      // Both entity types and all statuses matter: filenames do not prove ownership.
      const [movies, franchises] = await Promise.all([
        db.movie.findMany({ where: { coverPath: { not: null } }, select: { coverPath: true } }),
        db.franchise.findMany({ where: { coverPath: { not: null } }, select: { coverPath: true } }),
      ]);
      const absolute = path.resolve(dataPath(candidate));
      if ([...movies, ...franchises].some(({ coverPath }) => coverPath &&
          path.resolve(dataPath(coverPath.replaceAll("\\", "/"))) === absolute)) continue;
      await unlink(dataPath(candidate));
      removed.push(candidate);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
        // A committed delete/save must not be reported as failed because of cleanup.
        console.warn("Не удалось удалить неиспользуемую обложку:", candidate, error);
      }
    }
  }
  if (removed.length) {
    try { await posterMetadataStore.refresh(); }
    catch (error) { console.warn("Не удалось обновить индекс после удаления обложек:", error); }
  }
  return removed;
}
