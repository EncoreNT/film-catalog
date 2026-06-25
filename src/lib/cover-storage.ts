import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { prisma } from "./prisma";
import { probeMediaFile, extractEmbeddedCover } from "./ffprobe";

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
 * Extract an embedded attached picture (already located by a probe) and save
 * it as the movie's cover, but only when the movie doesn't already have one.
 * Used by the scanner, which has already probed the file. Failures are
 * non-fatal: a missing cover just means no poster, not a broken scan.
 */
export async function saveEmbeddedCoverFromProbe(
  movieId: number,
  filePath: string,
  probe: Awaited<ReturnType<typeof probeMediaFile>>,
  hasCover: boolean,
): Promise<void> {
  if (hasCover || !probe.embeddedCover) return;
  const extracted = await extractEmbeddedCover(filePath, probe.embeddedCover);
  if (!extracted) return;
  await saveCoverBuffer(movieId, extracted.buffer, extracted.ext);
}

/**
 * Probe a file for an embedded attached picture and, if present, extract it
 * as the movie's cover — but only when the movie doesn't already have one.
 * Used by the manual create flow, which hasn't probed yet. Extraction
 * failures are non-fatal: a missing cover just means no poster, not a broken
 * operation.
 */
export async function maybeExtractEmbeddedCover(
  movieId: number,
  filePath: string,
  hasCover: boolean,
): Promise<void> {
  if (hasCover) return;
  let probe;
  try {
    probe = await probeMediaFile(filePath);
  } catch {
    return;
  }
  await saveEmbeddedCoverFromProbe(movieId, filePath, probe, hasCover);
}
