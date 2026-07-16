import { prisma } from "@/lib/db/prisma";
import { createReleaseWithTracks } from "@/lib/releases/release-api";
import { probeMediaFile } from "@/lib/media/ffprobe";
import { releaseInclude } from "@/lib/movies/movie-include";

export async function registerBuildOutput(
  buildId: number,
  outputPath: string,
): Promise<number> {
  const build = await prisma.releaseBuild.findUnique({
    where: { id: buildId },
    select: {
      id: true,
      movieId: true,
      outputReleaseType: true,
      outputVersion: true,
      externalStorageId: true,
      outputReleaseId: true,
    },
  });
  if (!build) throw new Error("Сборка не найдена");
  if (build.outputReleaseId) return build.outputReleaseId;

  const probe = await probeMediaFile(outputPath);

  const release = await prisma.$transaction(async (tx) => {
    const created = await createReleaseWithTracks(tx, build.movieId, {
      filePath: outputPath,
      releaseType: build.outputReleaseType,
      version: build.outputVersion,
      externalStorageId: build.externalStorageId,
      durationSeconds: probe.durationSeconds,
      videoTrack: probe.video ?? undefined,
      audioTracks: probe.audio,
      subtitleTracks: probe.subtitles,
      skipProbe: true,
    });

    await tx.releaseBuild.update({
      where: { id: buildId },
      data: { outputReleaseId: created.id },
    });

    return tx.release.findUnique({
      where: { id: created.id },
      include: releaseInclude,
    });
  });

  if (!release) throw new Error("Не удалось зарегистрировать релиз");
  return release.id;
}
