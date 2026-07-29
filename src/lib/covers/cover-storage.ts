import { mkdir, unlink, writeFile } from "fs/promises";
import path from "path";
import { prisma } from "@/lib/db/prisma";
import { dataPath } from "@/lib/db/data-path";
import { assertCoverImageExtension } from "@/lib/covers/cover-formats-mkv";
import { COVER_IMAGE_EXTENSION_LIST } from "@/lib/covers/cover-formats";
import { extractFirstMkvAttachment } from "@/lib/covers/mkv";

const COVERS_DIR = dataPath("covers");

/** Remove prior cover files for the same entity (e.g. 2.jpeg when saving 2.jpg). */
export async function removeStaleEntityCovers(
  baseName: string,
  keepExt: string,
): Promise<void> {
  const keep = keepExt.toLowerCase();
  await Promise.all(
    COVER_IMAGE_EXTENSION_LIST.map(async (ext) => {
      if (ext === keep) return;
      try {
        await unlink(path.join(COVERS_DIR, `${baseName}${ext}`));
      } catch (err) {
        const code = (err as NodeJS.ErrnoException).code;
        if (code !== "ENOENT") throw err;
      }
    }),
  );
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
  await removeStaleEntityCovers(baseName, normalizedExt);
  const coverFileName = `${baseName}${normalizedExt}`;
  await writeFile(path.join(COVERS_DIR, coverFileName), buffer);
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
  const relativeCoverPath = await saveEntityCoverBuffer(
    String(movieId),
    buffer,
    ext,
  );
  await prisma.movie.update({
    where: { id: movieId },
    data: { coverPath: relativeCoverPath },
  });
  return relativeCoverPath;
}

/**
 * Extract the first embedded image attachment from a file (via mkvextract —
 * fast) and save it as the movie's cover, but only when the movie doesn't
 * already have one. Used by the scanner and the manual create flow. The
 * AbortSignal lets a scan cancellation interrupt the extraction. Failures are
 * non-fatal: a missing cover just means no poster, not a broken operation.
 */
export async function maybeExtractCover(
  movieId: number,
  filePath: string,
  hasCover: boolean,
  signal?: AbortSignal,
): Promise<void> {
  if (hasCover) return;
  const extracted = await extractFirstMkvAttachment(filePath, signal);
  if (!extracted) return;
  await saveCoverBuffer(movieId, extracted.buffer, extracted.ext);
}
