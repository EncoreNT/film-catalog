#!/usr/bin/env tsx
/**
 * Seeds ReleaseExport rows from real catalog releases (paths, sizes, slugs).
 * Wipes existing exports first. Restore DB when done:
 *   cp data/catalog.db.back data/catalog.db
 */
import "dotenv/config";
import path from "node:path";
import { prisma } from "../src/lib/db/prisma";
import type { Prisma } from "@/generated/prisma/client";
import {
  displayFilePath,
  joinRuntimePath,
  sanitizeFilename,
} from "../src/lib/shared/display-path";
import { formatFileSizeGB } from "../src/lib/shared/format";

interface ReleaseCtx {
  id: number;
  movieId: number;
  slug: string;
  title: string;
  filePath: string;
  fileSize: number;
}

interface ExportSeed {
  label: string;
  release: ReleaseCtx;
  status: "QUEUED" | "RUNNING" | "SUCCEEDED" | "FAILED" | "CANCELLED";
  progressRatio?: number;
  progressSpeedMbps?: number;
  errorMessage?: string;
  cancelRequested?: boolean;
  startedHoursAgo?: number;
  finishedHoursAgo?: number;
  createdHoursAgo?: number;
}

/** Slugs from your catalog — one release each, different movies. */
const FIXTURE_MOVIE_SLUGS = [
  "alita-boevoy-angel-alita-battle-angel",
  "ford-protiv-ferrari-ford-v-ferrari",
  "1408-1408",
  "amerikanskoe-chtivo-american-fiction",
] as const;

function basenameFromPath(filePath: string): string {
  return sanitizeFilename(path.posix.basename(filePath.replace(/\\/g, "/")));
}

function exportProgressMessage(copiedBytes: number, totalBytes: number): string {
  return `${formatFileSizeGB(copiedBytes) ?? "0 ГБ"} / ${formatFileSizeGB(totalBytes) ?? "—"}`;
}

function buildScenarios(
  releases: ReleaseCtx[],
  mediaSaveDir: string,
): Array<ExportSeed & { targetPath: string; targetFilename: string }> {
  const bySlug = new Map(releases.map((r) => [r.slug, r]));
  const pick = (slug: (typeof FIXTURE_MOVIE_SLUGS)[number]) => {
    const release = bySlug.get(slug);
    if (!release) {
      throw new Error(`Release not found for slug: ${slug}`);
    }
    return release;
  };

  const alita = pick("alita-boevoy-angel-alita-battle-angel");
  const ford = pick("ford-protiv-ferrari-ford-v-ferrari");
  const r1408 = pick("1408-1408");
  const fiction = pick("amerikanskoe-chtivo-american-fiction");

  const target = (release: ReleaseCtx) => {
    const targetFilename = basenameFromPath(release.filePath);
    const targetPath = joinRuntimePath(mediaSaveDir, targetFilename);
    return { targetPath, targetFilename };
  };

  return [
    {
      label: "RUNNING ~47% — Алита (51 ГБ)",
      release: alita,
      status: "RUNNING",
      progressRatio: 0.473,
      progressSpeedMbps: 118,
      startedHoursAgo: 0.08,
      createdHoursAgo: 0.1,
      ...target(alita),
    },
    {
      label: "QUEUED — Ford vs Ferrari (57 ГБ)",
      release: ford,
      status: "QUEUED",
      createdHoursAgo: 0.05,
      ...target(ford),
    },
    {
      label: "FAILED — 1408 (нет места на диске)",
      release: r1408,
      status: "FAILED",
      progressRatio: 0.12,
      errorMessage: "ENOSPC: no space left on device",
      startedHoursAgo: 2,
      finishedHoursAgo: 1.95,
      createdHoursAgo: 2.1,
      ...target(r1408),
    },
    {
      label: "SUCCEEDED — American Fiction (7 ГБ)",
      release: fiction,
      status: "SUCCEEDED",
      progressRatio: 1,
      startedHoursAgo: 5,
      finishedHoursAgo: 4.8,
      createdHoursAgo: 5.2,
      ...target(fiction),
    },
  ];
}

async function loadReleaseFixtures(): Promise<ReleaseCtx[]> {
  const rows = await prisma.release.findMany({
    where: {
      filePath: { not: null },
      movie: {
        slug: { in: [...FIXTURE_MOVIE_SLUGS] },
        status: "CATALOG",
      },
    },
    select: {
      id: true,
      movieId: true,
      filePath: true,
      fileSize: true,
      movie: { select: { slug: true, title: true } },
    },
  });

  return rows
    .filter((r) => r.filePath?.trim() && r.fileSize != null && r.fileSize > 0)
    .map((r) => ({
      id: r.id,
      movieId: r.movieId,
      slug: r.movie.slug,
      title: r.movie.title,
      filePath: r.filePath!.trim(),
      fileSize: r.fileSize!,
    }));
}

async function insertExport(
  seed: ExportSeed & { targetPath: string; targetFilename: string },
  queueOrder: number,
  now: number,
) {
  const hours = (h: number) => new Date(now - h * 3600_000);
  const totalBytes = seed.release.fileSize;
  const copiedBytes =
    seed.progressRatio != null
      ? Math.min(totalBytes, Math.round(totalBytes * seed.progressRatio))
      : 0;

  const data: Prisma.ReleaseExportCreateInput = {
    movie: { connect: { id: seed.release.movieId } },
    release: { connect: { id: seed.release.id } },
    status: seed.status,
    queueOrder,
    sourceFilePath: seed.release.filePath,
    sourceFileSize: totalBytes,
    targetPath: seed.targetPath,
    targetFilename: seed.targetFilename,
    phase: seed.status === "RUNNING" ? "copying" : null,
    progressPercent:
      seed.progressRatio != null
        ? Math.round(seed.progressRatio * 1000) / 10
        : null,
    progressMessage:
      seed.progressRatio != null
        ? exportProgressMessage(copiedBytes, totalBytes)
        : null,
    progressSpeed:
      seed.progressSpeedMbps != null
        ? seed.progressSpeedMbps * 1024 * 1024
        : null,
    errorMessage: seed.errorMessage ?? null,
    cancelRequested: seed.cancelRequested ?? false,
    startedAt: seed.startedHoursAgo != null ? hours(seed.startedHoursAgo) : null,
    finishedAt:
      seed.finishedHoursAgo != null ? hours(seed.finishedHoursAgo) : null,
    createdAt:
      seed.createdHoursAgo != null ? hours(seed.createdHoursAgo) : undefined,
    heartbeatAt: seed.status === "RUNNING" ? new Date() : null,
  };

  return prisma.releaseExport.create({ data, select: { id: true } });
}

async function main() {
  const targetDir =
    process.argv[2]?.trim() || process.env.EXPORT_TARGET_DIR?.trim() || "/mnt/d/Shared/TV";
  const releases = await loadReleaseFixtures();

  const missing = FIXTURE_MOVIE_SLUGS.filter(
    (slug) => !releases.some((r) => r.slug === slug),
  );
  if (missing.length > 0) {
    throw new Error(
      `В каталоге нет релизов для slug: ${missing.join(", ")}`,
    );
  }

  const before = await prisma.releaseExport.count();
  const deleted = await prisma.releaseExport.deleteMany({});
  console.log(`Removed ${deleted.count} existing export(s) (was ${before}).`);
  console.log(`Папка назначения (target): ${displayFilePath(targetDir)}\n`);

  const now = Date.now();
  const scenarios = buildScenarios(releases, targetDir);
  console.log(`Seeding ${scenarios.length} exports from real catalog data…\n`);

  let queueOrder = 0;
  const previewUrls: string[] = [];

  for (const seed of scenarios) {
    queueOrder += 1;
    const { id } = await insertExport(seed, queueOrder, now);
    const url = `/movies/${seed.release.slug}`;
    console.log(`  #${id}  ${seed.status.padEnd(10)}  ${seed.label}`);
    console.log(`         ${seed.release.title}`);
    console.log(`         from  ${displayFilePath(seed.release.filePath)}`);
    console.log(`         to    ${displayFilePath(seed.targetPath)}`);
    console.log(`         ${url}\n`);

    if (seed.status === "QUEUED" || seed.status === "RUNNING") {
      previewUrls.push(`${seed.status.padEnd(8)} → http://localhost:3000${url}`);
    }
  }

  const sonic = await prisma.movie.findFirst({
    where: { slug: "sonik-2-v-kino-sonic-the-hedgehog-2" },
    select: {
      slug: true,
      releases: {
        where: { filePath: { not: null } },
        select: { id: true, filePath: true, fileSize: true },
        orderBy: { id: "asc" },
      },
    },
  });
  if (sonic && sonic.releases.length > 1) {
    console.log(
      "Бонус: у «Соник 2» два релиза — можно посмотреть переключение вкладок,",
    );
    console.log(
      `  http://localhost:3000/movies/${sonic.slug}?release=${sonic.releases[0]!.id}`,
    );
  }

  console.log("\nПолоска прогресса — на странице фильма (не вкладки):");
  for (const line of previewUrls) {
    console.log(`  ${line}`);
  }
  console.log("\nRestore when done: cp data/catalog.db.back data/catalog.db");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
