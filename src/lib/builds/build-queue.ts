import { prisma } from "@/lib/db/prisma";
import type { ReleaseBuildAudioMode, ReleaseBuildStatus } from "@/generated/prisma/client";
import {
  BUILD_HEARTBEAT_INTERVAL_MS,
  BUILD_STALE_LEASE_MS,
} from "@/lib/builds/build-presets";
import type { BuildRecipe } from "@/lib/builds/build-validation";
import type { BuildWarning } from "@/lib/builds/build-inspect-runtime";
import { releaseInclude } from "@/lib/movies/movie-include";

const ACTIVE_STATUSES: ReleaseBuildStatus[] = ["QUEUED", "RUNNING"];

export async function enqueueBuild(
  movieId: number,
  validated: {
    recipe: BuildRecipe;
    warnings: BuildWarning[];
    videoSourceReleaseId: number;
    videoDurationSeconds: number | null;
  },
) {
  const sourceReleaseIds = [
    ...new Set(validated.recipe.tracks.map((t) => t.sourceReleaseId)),
  ];
  const releases = await prisma.release.findMany({
    where: { id: { in: sourceReleaseIds } },
    select: { id: true, filePath: true },
  });
  const releasePathMap = new Map(
    releases.map((r) => [r.id, r.filePath?.trim() ?? ""]),
  );

  return prisma.releaseBuild.create({
    data: {
      movieId,
      status: "QUEUED",
      outputPath: validated.recipe.outputPath,
      outputReleaseType: validated.recipe.outputReleaseType ?? null,
      outputVersion: validated.recipe.outputVersion ?? "theatrical",
      externalStorageId: validated.recipe.externalStorageId ?? null,
      acknowledgedWarnings: JSON.stringify(validated.warnings),
      sources: {
        create: sourceReleaseIds.map((releaseId) => ({
          releaseId,
          filePath: releasePathMap.get(releaseId) ?? "",
          durationSeconds: null,
          role:
            releaseId === validated.videoSourceReleaseId ? "video" : "tracks",
        })),
      },
      tracks: {
        create: validated.recipe.tracks.map((track, sortOrder) => ({
          sortOrder,
          kind: track.kind.toUpperCase() as "VIDEO" | "AUDIO" | "SUBTITLE",
          sourceReleaseId: track.sourceReleaseId,
          sourceStreamIndex: track.sourceStreamIndex,
          sourceFilePath: releasePathMap.get(track.sourceReleaseId) ?? "",
          sourceTrackLabel: track.label ?? null,
          audioMode:
            track.kind === "audio"
              ? ((track.audioMode ?? "copy").toUpperCase() as ReleaseBuildAudioMode)
              : null,
          transcodeCodec: track.transcodeCodec ?? null,
          transcodeBitrate: track.transcodeBitrate ?? null,
          channelTarget: track.channelTarget
            ? track.channelTarget === "stereo"
              ? "STEREO"
              : "UP_TO_51"
            : null,
          offsetMs: track.offsetMs ?? 0,
          isDefault: track.isDefault ?? false,
          forced: track.forced ?? false,
          keepOriginal: track.keepOriginal ?? false,
        })),
      },
    },
    include: buildInclude,
  });
}

export const buildInclude = {
  movie: {
    select: { id: true, slug: true, title: true, coverPath: true, updatedAt: true },
  },
  outputRelease: {
    include: releaseInclude,
  },
  externalStorage: { select: { id: true, name: true } },
  sources: {
    include: {
      release: { include: releaseInclude },
    },
  },
  tracks: { orderBy: { sortOrder: "asc" as const } },
} as const;

export async function claimNextBuild(workerId: string) {
  await recoverStaleBuilds();

  const candidate = await prisma.releaseBuild.findFirst({
    where: { status: "QUEUED", cancelRequested: false },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });
  if (!candidate) return null;

  const now = new Date();
  const updated = await prisma.releaseBuild.updateMany({
    where: { id: candidate.id, status: "QUEUED" },
    data: {
      status: "RUNNING",
      phase: "starting",
      startedAt: now,
      heartbeatAt: now,
      progressPercent: 0,
      progressMessage: `worker:${workerId}`,
      errorMessage: null,
    },
  });

  if (updated.count === 0) return null;

  return prisma.releaseBuild.findUnique({
    where: { id: candidate.id },
    include: buildInclude,
  });
}

export async function recoverStaleBuilds() {
  const staleBefore = new Date(Date.now() - BUILD_STALE_LEASE_MS);
  const stale = await prisma.releaseBuild.findMany({
    where: {
      status: "RUNNING",
      OR: [{ heartbeatAt: { lt: staleBefore } }, { heartbeatAt: null }],
    },
    select: { id: true },
  });

  for (const job of stale) {
    await prisma.releaseBuild.update({
      where: { id: job.id },
      data: {
        status: "QUEUED",
        phase: "recovered",
        progressMessage: "Восстановление после сбоя worker",
        heartbeatAt: null,
      },
    });
  }
}

export async function touchBuildHeartbeat(buildId: number) {
  await prisma.releaseBuild.update({
    where: { id: buildId },
    data: { heartbeatAt: new Date() },
  });
}

export function startHeartbeat(buildId: number): () => void {
  const timer = setInterval(() => {
    void touchBuildHeartbeat(buildId);
  }, BUILD_HEARTBEAT_INTERVAL_MS);
  return () => clearInterval(timer);
}

export async function updateBuildProgress(
  buildId: number,
  data: {
    phase?: string;
    progressPercent?: number;
    progressMessage?: string;
  },
) {
  await prisma.releaseBuild.update({
    where: { id: buildId },
    data: {
      ...data,
      heartbeatAt: new Date(),
    },
  });
}

export async function finishBuild(
  buildId: number,
  status: ReleaseBuildStatus,
  data?: { errorMessage?: string; outputReleaseId?: number },
) {
  await prisma.releaseBuild.update({
    where: { id: buildId },
    data: {
      status,
      finishedAt: new Date(),
      errorMessage: data?.errorMessage ?? null,
      outputReleaseId: data?.outputReleaseId ?? undefined,
      progressPercent: status === "SUCCEEDED" ? 100 : undefined,
    },
  });
}

export async function requestBuildCancel(buildId: number) {
  const build = await prisma.releaseBuild.findUnique({
    where: { id: buildId },
    select: { status: true },
  });
  if (!build) throw new Error("Сборка не найдена");
  if (!ACTIVE_STATUSES.includes(build.status)) {
    throw new Error("Сборка уже завершена");
  }

  if (build.status === "QUEUED") {
    return prisma.releaseBuild.update({
      where: { id: buildId },
      data: {
        status: "CANCELLED",
        cancelRequested: true,
        finishedAt: new Date(),
        progressMessage: "Отменено до запуска",
      },
      include: buildInclude,
    });
  }

  return prisma.releaseBuild.update({
    where: { id: buildId },
    data: { cancelRequested: true, progressMessage: "Запрошена отмена" },
    include: buildInclude,
  });
}

export async function retryBuild(buildId: number) {
  const build = await prisma.releaseBuild.findUnique({
    where: { id: buildId },
    select: { status: true },
  });
  if (!build) throw new Error("Сборка не найдена");
  if (build.status !== "FAILED" && build.status !== "CANCELLED") {
    throw new Error("Повтор доступен только для неуспешных или отменённых сборок");
  }

  return prisma.releaseBuild.update({
    where: { id: buildId },
    data: {
      status: "QUEUED",
      phase: null,
      progressPercent: 0,
      progressMessage: null,
      errorMessage: null,
      cancelRequested: false,
      heartbeatAt: null,
      startedAt: null,
      finishedAt: null,
      outputReleaseId: null,
    },
    include: buildInclude,
  });
}

export async function assertMovieHasNoActiveBuilds(movieId: number) {
  const active = await prisma.releaseBuild.count({
    where: { movieId, status: { in: ACTIVE_STATUSES } },
  });
  if (active > 0) {
    throw new Error("У фильма уже есть активная сборка");
  }
}

export async function isBuildCancelRequested(buildId: number): Promise<boolean> {
  const build = await prisma.releaseBuild.findUnique({
    where: { id: buildId },
    select: { cancelRequested: true },
  });
  return build?.cancelRequested ?? false;
}
