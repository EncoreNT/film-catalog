import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { prisma } from "@/lib/db/prisma";
import { dataPath } from "@/lib/db/data-path";
import { assertCoverImageExtension } from "@/lib/covers/cover-formats-mkv";
import { extractFirstMkvAttachment } from "@/lib/covers/mkv";

const COVERS_DIR = dataPath("covers");

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
  await mkdir(COVERS_DIR, { recursive: true });
  const coverFileName = `${baseName}${ext}`;
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
