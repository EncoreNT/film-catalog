import type { Prisma } from "@/generated/prisma/client";
import { buildInclude } from "@/lib/builds/build-queue";

type BuildWithRelations = Prisma.ReleaseBuildGetPayload<{
  include: typeof buildInclude;
}>;

export function serializeBuild(build: BuildWithRelations) {
  let warnings: unknown[] = [];
  if (build.acknowledgedWarnings) {
    try {
      warnings = JSON.parse(build.acknowledgedWarnings) as unknown[];
    } catch {
      warnings = [];
    }
  }

  return {
    id: build.id,
    movieId: build.movieId,
    movie: build.movie,
    status: build.status,
    phase: build.phase,
    progressPercent: build.progressPercent,
    progressMessage: build.progressMessage,
    errorMessage: build.errorMessage,
    cancelRequested: build.cancelRequested,
    outputPath: build.outputPath,
    outputReleaseType: build.outputReleaseType,
    outputVersion: build.outputVersion,
    outputReleaseId: build.outputReleaseId,
    outputRelease: build.outputRelease,
    externalStorage: build.externalStorage,
    warnings,
    sources: build.sources.map((s) => ({
      id: s.id,
      releaseId: s.releaseId,
      filePath: s.filePath,
      durationSeconds: s.durationSeconds,
      role: s.role,
      release: s.release,
    })),
    tracks: build.tracks.map((t) => ({
      id: t.id,
      sortOrder: t.sortOrder,
      kind: t.kind,
      sourceReleaseId: t.sourceReleaseId,
      sourceStreamIndex: t.sourceStreamIndex,
      sourceFilePath: t.sourceFilePath,
      sourceTrackLabel: t.sourceTrackLabel,
      audioMode: t.audioMode,
      transcodeCodec: t.transcodeCodec,
      transcodeBitrate: t.transcodeBitrate,
      channelTarget: t.channelTarget,
      offsetMs: t.offsetMs,
      isDefault: t.isDefault,
      forced: t.forced,
    })),
    startedAt: build.startedAt?.toISOString() ?? null,
    finishedAt: build.finishedAt?.toISOString() ?? null,
    createdAt: build.createdAt.toISOString(),
    updatedAt: build.updatedAt.toISOString(),
  };
}

export type SerializedBuild = ReturnType<typeof serializeBuild>;
