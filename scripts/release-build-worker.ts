#!/usr/bin/env tsx
import "dotenv/config";
import { claimAvailableMediaJobs, type MediaJob } from "../src/lib/worker/claim-next-media-job";
import { runBuildJob } from "../src/lib/builds/build-runner";
import { runExportJob } from "../src/lib/releases/export-runner";
import {
  assertBuildCapabilities,
  getBuildCapabilities,
} from "../src/lib/builds/build-capabilities";

const WORKER_ID = `media-worker-${process.pid}`;
const POLL_MS = 2_000;

async function sleep(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  let buildsEnabled = assertBuildCapabilities(await getBuildCapabilities()) == null;
  if (!buildsEnabled) {
    console.warn(
      `[${WORKER_ID}] инструменты сборки недоступны — экспорт работает; установите ffmpeg/ffprobe/mkvmerge`,
    );
  } else {
    console.log(`[${WORKER_ID}] started (copy: unlimited, transcode: max 2 parallel)`);
  }

  const shutdown = { value: false };
  const inFlight = new Set<Promise<void>>();
  const activeJobIds = new Set<string>();

  const handleSignal = () => {
    shutdown.value = true;
  };
  process.on("SIGINT", handleSignal);
  process.on("SIGTERM", handleSignal);

  async function executeJob(job: MediaJob) {
    const key = `${job.kind}:${job.id}`;
    console.log(`[${WORKER_ID}] running ${job.kind} #${job.id}`);
    const controller = new AbortController();

    try {
      if (job.kind === "build") {
        await runBuildJob(job.id, controller.signal);
      } else {
        await runExportJob(job.id, controller.signal);
      }
      console.log(`[${WORKER_ID}] finished ${job.kind} #${job.id}`);
    } catch (err) {
      console.error(`[${WORKER_ID}] ${job.kind} #${job.id} failed`, err);
    } finally {
      activeJobIds.delete(key);
    }
  }

  async function fillSlots() {
    if (!buildsEnabled) {
      buildsEnabled = assertBuildCapabilities(await getBuildCapabilities()) == null;
      if (buildsEnabled) {
        console.log(`[${WORKER_ID}] инструменты найдены, обрабатываю очередь сборок`);
      }
    }

    const jobs = await claimAvailableMediaJobs(WORKER_ID, {
      includeBuilds: buildsEnabled,
    });

    for (const job of jobs) {
      const key = `${job.kind}:${job.id}`;
      if (activeJobIds.has(key)) continue;
      activeJobIds.add(key);

      const task = executeJob(job);
      inFlight.add(task);
      void task.finally(() => {
        inFlight.delete(task);
        if (!shutdown.value) {
          void fillSlots();
        }
      });
    }
  }

  while (!shutdown.value) {
    await fillSlots();
    await sleep(POLL_MS);
  }

  if (inFlight.size > 0) {
    console.log(`[${WORKER_ID}] waiting for ${inFlight.size} active job(s)...`);
    await Promise.allSettled([...inFlight]);
  }

  console.log(`[${WORKER_ID}] stopped`);
}

void main();
