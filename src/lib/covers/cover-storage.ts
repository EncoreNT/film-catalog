import { withCoverMutation } from "@/lib/covers/cover-mutation";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { prisma } from "@/lib/db/prisma";
import { dataPath } from "@/lib/db/data-path";
import { assertCoverImageExtension } from "@/lib/covers/cover-formats-mkv";
import { COVER_IMAGE_EXTENSION_LIST } from "@/lib/covers/cover-formats";
import { extractFirstMkvAttachment } from "@/lib/covers/mkv";
import { recordPosterMetadata } from "./poster-metadata";
import { cleanupUnreferencedCovers } from "./cleanup-covers";

const COVERS_DIR = dataPath("covers");

/** Remove prior cover files for the same entity (e.g. 2.jpeg when saving 2.jpg). */
export async function removeStaleEntityCovers(
  baseName: string,
  keepExt: string,
): Promise<void> {
  const keep = keepExt.toLowerCase();
  await cleanupUnreferencedCovers(COVER_IMAGE_EXTENSION_LIST
    .filter((ext) => ext !== keep)
    .map((ext) => `covers/${baseName}${ext}`));
}

/**
 * Write a cover image buffer to data/covers/<baseName><ext> and return the
 * relative path (covers/…). Shared by movie and franchise cover saves.
 */
export async function saveEntityCoverBuffer(
  baseName: string,
  buffer: Buffer,
  ext: string,
): Promise<string> {
  assertCoverImageExtension(ext);
  const normalizedExt = ext.toLowerCase();
  await mkdir(COVERS_DIR, { recursive: true });
  const coverFileName = `${baseName}${normalizedExt}`;
  await writeFile(path.join(COVERS_DIR, coverFileName), buffer);
  await recordPosterMetadata(coverFileName);
  return `covers/${coverFileName}`;
}

/**
 * Persist a cover image buffer for a movie and record its relative path.
 * Mirrors the convention used by the /api/movies/[id]/cover upload route:
 * files live in data/covers/<id><ext> and are served via /api/covers/[id].
 */
export async function saveCoverBuffer(
  movieId: number,
  buffer: Buffer,
  ext: string,
): Promise<string> {
  return withCoverMutation(async () => {
    const previous = await prisma.movie.findUniqueOrThrow({ where: { id: movieId }, select: { coverPath: true } });
    const relativeCoverPath = await saveEntityCoverBuffer(
      String(movieId),
      buffer,
      ext,
    );
    try {
      await prisma.movie.update({
        where: { id: movieId },
        data: { coverPath: relativeCoverPath },
      });
    } catch (error) {
      await cleanupUnreferencedCovers([relativeCoverPath]);
      throw error;
    }
    await cleanupUnreferencedCovers([previous.coverPath]);
    await removeStaleEntityCovers(String(movieId), ext);
    return relativeCoverPath;
  });
}

/**
 * Extract the first embedded image attachment from a file (via mkvextract —
 * fast) and save it as the movie's cover, but only when the movie doesn't
 * already have one. Used by the scanner and the manual create flow. The
 * AbortSignal lets a scan cancellation interrupt the extraction. Failures are
 * non-fatal: a missing cover just means no poster, not a broken operation.
 */
/** Extracts the first MKV attachment as a cover when the movie has none.
 *  Returns `true` when a cover was actually saved, `false` when skipped
 *  (already had one) or no attachment was found. Callers that ignore the
 *  return value keep working. */
export async function maybeExtractCover(
  movieId: number,
  filePath: string,
  hasCover: boolean,
  signal?: AbortSignal,
): Promise<boolean> {
  if (hasCover) return false;
  const extracted = await extractFirstMkvAttachment(filePath, signal);
  if (!extracted) return false;
  await saveCoverBuffer(movieId, extracted.buffer, extracted.ext);
  return true;
}
