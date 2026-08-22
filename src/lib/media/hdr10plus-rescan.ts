import { prisma } from "@/lib/db/prisma";
import { probeMediaFile } from "@/lib/media/ffprobe";
import { displayFilePath } from "@/lib/shared/display-path";

export type Hdr10PlusRescanEvent =
  | { type: "start"; total: number }
  | {
      type: "file";
      index: number;
      total: number;
      releaseId: number;
      movieTitle: string;
      movieSlug: string;
      fileName: string;
      before: { hdr: string | null; hasHdr10Plus: boolean };
      after: { hdr: string | null; hasHdr10Plus: boolean };
      changed: boolean;
      found: boolean;
    }
  | {
      type: "error";
      index: number;
      total: number;
      releaseId: number;
      movieTitle: string;
      message: string;
    }
  | {
      type: "summary";
      checked: number;
      found: number;
      updated: number;
      errors: number;
    };

interface RescanOptions {
  signal?: AbortSignal;
  onProgress: (event: Hdr10PlusRescanEvent) => void;
}

function fileNameFromPath(filePath: string | null): string {
  if (!filePath) return "—";
  const display = displayFilePath(filePath);
  const slash = Math.max(display.lastIndexOf("/"), display.lastIndexOf("\\"));
  return slash >= 0 ? display.slice(slash + 1) : display;
}

export async function rescanHdr10PlusReleases(
  options: RescanOptions,
): Promise<void> {
  const { signal, onProgress } = options;

  const releases = await prisma.release.findMany({
    where: {
      filePath: { not: null },
      videoTrack: {
        hdr: { not: "SDR" },
      },
    },
    select: {
      id: true,
      filePath: true,
      videoTrack: { select: { id: true, hdr: true, hasHdr10Plus: true } },
      movie: { select: { title: true, slug: true } },
    },
    orderBy: { id: "asc" },
  });

  const total = releases.length;
  onProgress({ type: "start", total });

  let checked = 0;
  let found = 0;
  let updated = 0;
  let errors = 0;

  for (let i = 0; i < releases.length; i++) {
    if (signal?.aborted) break;
    const release = releases[i]!;
    const track = release.videoTrack;
    const movieTitle = release.movie.title;
    const index = i + 1;

    if (!track || !release.filePath) {
      errors += 1;
      onProgress({
        type: "error",
        index,
        total,
        releaseId: release.id,
        movieTitle,
        message: "Нет файла или видеотрека",
      });
      continue;
    }

    try {
      const probe = await probeMediaFile(release.filePath, signal);
      const hdr = probe.video?.hdr ?? track.hdr;
      const hasHdr10Plus = probe.video?.hasHdr10Plus ?? false;
      const changed =
        hdr !== track.hdr || hasHdr10Plus !== track.hasHdr10Plus;

      if (changed) {
        await prisma.videoTrack.update({
          where: { id: track.id },
          data: { hdr, hasHdr10Plus },
        });
        updated += 1;
      }

      checked += 1;
      if (hasHdr10Plus) found += 1;

      onProgress({
        type: "file",
        index,
        total,
        releaseId: release.id,
        movieTitle,
        movieSlug: release.movie.slug,
        fileName: fileNameFromPath(release.filePath),
        before: { hdr: track.hdr, hasHdr10Plus: track.hasHdr10Plus },
        after: { hdr, hasHdr10Plus },
        changed,
        found: hasHdr10Plus,
      });
    } catch (err) {
      errors += 1;
      const message =
        err instanceof Error ? err.message : "Не удалось прочитать файл";
      onProgress({
        type: "error",
        index,
        total,
        releaseId: release.id,
        movieTitle,
        message,
      });
    }
  }

  onProgress({ type: "summary", checked, found, updated, errors });
}
