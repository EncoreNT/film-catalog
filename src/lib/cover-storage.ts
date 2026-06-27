import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { prisma } from "./prisma";
import { extractFirstMkvAttachment } from "./mkv";

const COVERS_DIR = path.join(process.cwd(), "data", "covers");

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
  await mkdir(COVERS_DIR, { recursive: true });
  const coverFileName = `${movieId}${ext}`;
  await writeFile(path.join(COVERS_DIR, coverFileName), buffer);
  const relativeCoverPath = `covers/${coverFileName}`;
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
