#!/usr/bin/env tsx
/**
 * Seeds ReleaseBuild rows for UI work (/builds, /builds/[id]).
 * Wipes existing builds first. Restore DB from backup when done:
 *   cp data/catalog.db.back data/catalog.db
 */
import "dotenv/config";
import { prisma } from "../src/lib/db/prisma";
import type { Prisma } from "@/generated/prisma/client";

type BuildWarning = { code: string; message: string; severity: string };

interface ReleaseCtx {
  id: number;
  movieId: number;
  filePath: string;
  releaseType: string | null;
}

interface TrackSeed {
  kind: "VIDEO" | "AUDIO" | "SUBTITLE";
  sourceReleaseId: number;
  sourceStreamIndex: number;
  sourceFilePath: string;
  sourceTrackLabel?: string;
  audioMode?: "COPY" | "TRANSCODE";
  transcodeCodec?: string;
  transcodeBitrate?: number;
  channelTarget?: "STEREO" | "UP_TO_51";
  offsetMs?: number;
  isDefault?: boolean;
  forced?: boolean;
  keepOriginal?: boolean;
}

interface BuildSeed {
  label: string;
  movieId: number;
  status: "QUEUED" | "RUNNING" | "SUCCEEDED" | "FAILED" | "CANCELLED";
  outputPath: string;
  outputReleaseType?: string | null;
  phase?: string | null;
  progressPercent?: number | null;
  progressMessage?: string | null;
  errorMessage?: string | null;
  cancelRequested?: boolean;
  warnings?: BuildWarning[];
  outputReleaseId?: number | null;
  startedAt?: Date | null;
  finishedAt?: Date | null;
  createdAt?: Date;
  tracks: TrackSeed[];
  sourceReleaseIds: number[];
  videoSourceReleaseId: number;
}

function alitaRecipe(release: ReleaseCtx): TrackSeed[] {
  return [
    {
      kind: "VIDEO",
      sourceReleaseId: release.id,
      sourceStreamIndex: 0,
      sourceFilePath: release.filePath,
      sourceTrackLabel: "Видео",
    },
    {
      kind: "AUDIO",
      sourceReleaseId: release.id,
      sourceStreamIndex: 1,
      sourceFilePath: release.filePath,
      sourceTrackLabel: "Rus DTS-HD 7.1",
      audioMode: "COPY",
      isDefault: true,
    },
    {
      kind: "AUDIO",
      sourceReleaseId: release.id,
      sourceStreamIndex: 7,
      sourceFilePath: release.filePath,
      sourceTrackLabel: "Eng TrueHD Atmos",
      audioMode: "TRANSCODE",
      transcodeCodec: "eac3",
      transcodeBitrate: 768,
      channelTarget: "UP_TO_51",
      keepOriginal: true,
    },
    {
      kind: "SUBTITLE",
      sourceReleaseId: release.id,
      sourceStreamIndex: 0,
      sourceFilePath: release.filePath,
      sourceTrackLabel: "Forced RUS",
      forced: true,
      isDefault: true,
    },
    {
      kind: "SUBTITLE",
      sourceReleaseId: release.id,
      sourceStreamIndex: 3,
      sourceFilePath: release.filePath,
      sourceTrackLabel: "Full ENG",
    },
  ];
}

/** 4K HDR + rus dub Atmos 7.1 — resolves to ruby visual tier in UI. */
function rubyRecipe(
  release: ReleaseCtx,
  options?: { engStreamIndex?: number },
): TrackSeed[] {
  const tracks: TrackSeed[] = [
    {
      kind: "VIDEO",
      sourceReleaseId: release.id,
      sourceStreamIndex: 0,
      sourceFilePath: release.filePath,
      sourceTrackLabel: "Видео",
    },
    {
      kind: "AUDIO",
      sourceReleaseId: release.id,
      sourceStreamIndex: 0,
      sourceFilePath: release.filePath,
      sourceTrackLabel: "Rus Atmos 7.1",
      audioMode: "COPY",
      isDefault: true,
    },
    {
      kind: "SUBTITLE",
      sourceReleaseId: release.id,
      sourceStreamIndex: 0,
      sourceFilePath: release.filePath,
      sourceTrackLabel: "Forced RUS",
      forced: true,
      isDefault: true,
    },
  ];

  if (options?.engStreamIndex != null) {
    tracks.splice(2, 0, {
      kind: "AUDIO",
      sourceReleaseId: release.id,
      sourceStreamIndex: options.engStreamIndex,
      sourceFilePath: release.filePath,
      sourceTrackLabel: "Eng Atmos 7.1",
      audioMode: "TRANSCODE",
      transcodeCodec: "eac3",
      transcodeBitrate: 768,
      channelTarget: "UP_TO_51",
      keepOriginal: true,
    });
  }

  return tracks;
}

function simpleRecipe(release: ReleaseCtx): TrackSeed[] {
  return [
    {
      kind: "VIDEO",
      sourceReleaseId: release.id,
      sourceStreamIndex: 0,
      sourceFilePath: release.filePath,
      sourceTrackLabel: "Видео",
    },
    {
      kind: "AUDIO",
      sourceReleaseId: release.id,
      sourceStreamIndex: 0,
      sourceFilePath: release.filePath,
      sourceTrackLabel: "Rus 5.1",
      audioMode: "COPY",
      isDefault: true,
    },
  ];
}

function buildScenarios(releases: Map<number, ReleaseCtx>): BuildSeed[] {
  const alita = releases.get(4);
  const r1408 = releases.get(2);
  const angels = releases.get(5);
  const avatar = releases.get(6);
  if (!alita || !r1408) {
    throw new Error(
      "Need movies with releases id=4 (Alita) and id=2 (1408). Adjust script or DB.",
    );
  }
  if (!angels || !avatar) {
    throw new Error(
      "Need releases id=5 (Angels & Demons) and id=6 (Avatar 2) for ruby tier fixtures.",
    );
  }

  const now = Date.now();
  const hours = (h: number) => new Date(now - h * 3600_000);

  return [
    {
      label: "queued — в очереди",
      movieId: alita.movieId,
      status: "QUEUED",
      outputPath: "/tmp/build-fixtures/alita-theatrical-ac3.mkv",
      outputReleaseType: "bdremux",
      progressMessage: null,
      createdAt: hours(0.2),
      sourceReleaseIds: [alita.id],
      videoSourceReleaseId: alita.id,
      tracks: alitaRecipe(alita),
    },
    {
      label: "queued — другой фильм",
      movieId: r1408.movieId,
      status: "QUEUED",
      outputPath: "/tmp/build-fixtures/1408-compact.mkv",
      outputReleaseType: "bdremux",
      createdAt: hours(1),
      sourceReleaseIds: [r1408.id],
      videoSourceReleaseId: r1408.id,
      tracks: simpleRecipe(r1408),
    },
    {
      label: "ruby — в очереди",
      movieId: angels.movieId,
      status: "QUEUED",
      outputPath: "/tmp/build-fixtures/angels-ruby.mkv",
      outputReleaseType: "bdremux",
      createdAt: hours(0.05),
      sourceReleaseIds: [angels.id],
      videoSourceReleaseId: angels.id,
      tracks: rubyRecipe(angels, { engStreamIndex: 1 }),
    },
    {
      label: "ruby — mux",
      movieId: avatar.movieId,
      status: "RUNNING",
      outputPath: "/tmp/build-fixtures/avatar-ruby-mux.mkv",
      outputReleaseType: "bdremux",
      phase: "mux",
      progressPercent: 88,
      progressMessage: "Сборка MKV 88%",
      startedAt: hours(0.08),
      createdAt: hours(0.12),
      sourceReleaseIds: [avatar.id],
      videoSourceReleaseId: avatar.id,
      tracks: rubyRecipe(avatar, { engStreamIndex: 2 }),
    },
    {
      label: "ruby — готово",
      movieId: angels.movieId,
      status: "SUCCEEDED",
      outputPath: "/tmp/build-fixtures/angels-ruby-done.mkv",
      outputReleaseType: "bdremux",
      phase: "done",
      progressPercent: 100,
      progressMessage: "Готово",
      startedAt: hours(12),
      finishedAt: hours(11),
      createdAt: hours(13),
      sourceReleaseIds: [angels.id],
      videoSourceReleaseId: angels.id,
      tracks: rubyRecipe(angels, { engStreamIndex: 1 }),
    },
    {
      label: "running — перекодирование (mock warnings)",
      movieId: alita.movieId,
      status: "RUNNING",
      outputPath: "/tmp/build-fixtures/alita-transcode.mkv",
      outputReleaseType: "bdremux",
      phase: "transcode",
      progressPercent: 38,
      progressMessage: "Перекодирование аудио #3",
      startedAt: hours(0.5),
      createdAt: hours(0.6),
      warnings: [
        {
          code: "duration_delta",
          message:
            "«Eng TrueHD Atmos»: длительность источника отличается от видео на 1.4 с",
          severity: "warning",
        },
        {
          code: "transcode_bitrate_upscale",
          message:
            "«Eng TrueHD Atmos»: битрейт 768 kbps выше источника (512 kbps). Апскейл не имеет смысла.",
          severity: "warning",
        },
        {
          code: "subtitle_forced_default",
          message:
            "«Rus forced»: принудительные субтитры помечены как дорожка по умолчанию",
          severity: "warning",
        },
      ],
      sourceReleaseIds: [alita.id],
      videoSourceReleaseId: alita.id,
      tracks: alitaRecipe(alita),
    },
    {
      label: "running — mux",
      movieId: alita.movieId,
      status: "RUNNING",
      outputPath: "/tmp/build-fixtures/alita-mux.mkv",
      outputReleaseType: "web-dl",
      phase: "mux",
      progressPercent: 72,
      progressMessage: "Сборка MKV 72%",
      startedAt: hours(0.3),
      createdAt: hours(0.4),
      sourceReleaseIds: [alita.id],
      videoSourceReleaseId: alita.id,
      tracks: alitaRecipe(alita),
    },
    {
      label: "running — отмена запрошена",
      movieId: alita.movieId,
      status: "RUNNING",
      outputPath: "/tmp/build-fixtures/alita-cancel.mkv",
      phase: "transcode",
      progressPercent: 12,
      progressMessage: "Запрошена отмена",
      cancelRequested: true,
      startedAt: hours(0.1),
      createdAt: hours(0.15),
      sourceReleaseIds: [alita.id],
      videoSourceReleaseId: alita.id,
      tracks: alitaRecipe(alita),
    },
    {
      label: "succeeded — готово",
      movieId: alita.movieId,
      status: "SUCCEEDED",
      outputPath: "/tmp/build-fixtures/alita-done.mkv",
      outputReleaseType: "bdremux",
      phase: "done",
      progressPercent: 100,
      progressMessage: "Готово",
      startedAt: hours(26),
      finishedAt: hours(24),
      createdAt: hours(27),
      sourceReleaseIds: [alita.id],
      videoSourceReleaseId: alita.id,
      tracks: alitaRecipe(alita),
    },
    {
      label: "succeeded — с предупреждениями",
      movieId: alita.movieId,
      status: "SUCCEEDED",
      outputPath: "/tmp/build-fixtures/alita-warnings.mkv",
      outputReleaseType: "bdremux",
      progressPercent: 100,
      startedAt: hours(50),
      finishedAt: hours(48),
      createdAt: hours(51),
      warnings: [
        {
          code: "duration_delta",
          message:
            "«Eng TrueHD Atmos»: длительность источника отличается от видео на 1.4 с",
          severity: "warning",
        },
        {
          code: "transcode_bitrate_upscale",
          message:
            "«Eng TrueHD Atmos»: битрейт 768 kbps выше источника (512 kbps). Апскейл не имеет смысла.",
          severity: "warning",
        },
        {
          code: "audio_copy_lossless",
          message:
            "«Rus DTS-HD 7.1»: lossless-источник копируется без перекодирования, размер MKV вырастет",
          severity: "warning",
        },
      ],
      sourceReleaseIds: [alita.id],
      videoSourceReleaseId: alita.id,
      tracks: alitaRecipe(alita),
    },
    {
      label: "failed — ошибка ffmpeg",
      movieId: alita.movieId,
      status: "FAILED",
      outputPath: "/tmp/build-fixtures/alita-failed.mkv",
      phase: "transcode",
      progressPercent: 41,
      progressMessage: "Перекодирование аудио #3",
      errorMessage: "ffmpeg exited with code 1: Invalid channel layout for E-AC-3",
      startedAt: hours(3),
      finishedAt: hours(2.9),
      createdAt: hours(3.1),
      sourceReleaseIds: [alita.id],
      videoSourceReleaseId: alita.id,
      tracks: alitaRecipe(alita),
    },
    {
      label: "cancelled — отменено",
      movieId: r1408.movieId,
      status: "CANCELLED",
      outputPath: "/tmp/build-fixtures/1408-cancelled.mkv",
      progressMessage: "Отменено до запуска",
      createdAt: hours(5),
      sourceReleaseIds: [r1408.id],
      videoSourceReleaseId: r1408.id,
      tracks: simpleRecipe(r1408),
    },
  ];
}

async function insertBuild(seed: BuildSeed, releases: Map<number, ReleaseCtx>) {
  const data: Prisma.ReleaseBuildCreateInput = {
    movie: { connect: { id: seed.movieId } },
    status: seed.status,
    outputPath: seed.outputPath,
    outputReleaseType: seed.outputReleaseType ?? null,
    outputVersion: "theatrical",
    phase: seed.phase ?? null,
    progressPercent: seed.progressPercent ?? null,
    progressMessage: seed.progressMessage ?? null,
    errorMessage: seed.errorMessage ?? null,
    cancelRequested: seed.cancelRequested ?? false,
    acknowledgedWarnings: seed.warnings?.length
      ? JSON.stringify(seed.warnings)
      : null,
    startedAt: seed.startedAt ?? null,
    finishedAt: seed.finishedAt ?? null,
    createdAt: seed.createdAt,
    heartbeatAt: seed.status === "RUNNING" ? new Date() : null,
    sources: {
      create: seed.sourceReleaseIds.map((releaseId) => {
        const release = releases.get(releaseId)!;
        return {
          releaseId,
          filePath: release.filePath,
          durationSeconds: 7620,
          role: releaseId === seed.videoSourceReleaseId ? "video" : "tracks",
        };
      }),
    },
    tracks: {
      create: seed.tracks.map((track, sortOrder) => ({
        sortOrder,
        kind: track.kind,
        sourceReleaseId: track.sourceReleaseId,
        sourceStreamIndex: track.sourceStreamIndex,
        sourceFilePath: track.sourceFilePath,
        sourceTrackLabel: track.sourceTrackLabel ?? null,
        audioMode: track.audioMode ?? null,
        transcodeCodec: track.transcodeCodec ?? null,
        transcodeBitrate: track.transcodeBitrate ?? null,
        channelTarget: track.channelTarget ?? null,
        offsetMs: track.offsetMs ?? 0,
        isDefault: track.isDefault ?? false,
        forced: track.forced ?? false,
        keepOriginal: track.keepOriginal ?? false,
      })),
    },
  };

  return prisma.releaseBuild.create({ data, select: { id: true } });
}

async function main() {
  const releaseRows = await prisma.release.findMany({
    where: { id: { in: [2, 4, 5, 6] } },
    select: {
      id: true,
      movieId: true,
      filePath: true,
      releaseType: true,
    },
  });

  const releases = new Map<number, ReleaseCtx>(
    releaseRows.map((r) => [
      r.id,
      {
        id: r.id,
        movieId: r.movieId,
        filePath: r.filePath?.trim() ?? "",
        releaseType: r.releaseType,
      },
    ]),
  );

  const before = await prisma.releaseBuild.count();
  const deleted = await prisma.releaseBuild.deleteMany({});
  console.log(`Removed ${deleted.count} existing build(s) (was ${before}).`);

  const scenarios = buildScenarios(releases);
  console.log(`Seeding ${scenarios.length} fixture builds…\n`);

  for (const seed of scenarios) {
    const { id } = await insertBuild(seed, releases);
    console.log(`  #${id}  ${seed.status.padEnd(10)}  ${seed.label}`);
    console.log(`         /builds/${id}`);
  }

  console.log("\nList: http://localhost:3000/builds");
  console.log("Restore when done: cp data/catalog.db.back data/catalog.db");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
