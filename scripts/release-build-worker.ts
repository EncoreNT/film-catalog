#!/usr/bin/env tsx
import "dotenv/config";
import { claimNextMediaJob } from "../src/lib/worker/claim-next-media-job";
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
  let capError = assertBuildCapabilities(await getBuildCapabilities());
  if (capError) {
    console.warn(
      `[${WORKER_ID}] ${capError} — сборки отключены; экспорт и каталог работают; установите ffmpeg/ffprobe/mkvmerge или перезапустите worker`,
    );
  } else {
    console.log(`[${WORKER_ID}] started`);
  }

  const shutdown = { value: false };
  const handleSignal = () => {
    shutdown.value = true;
  };
  process.on("SIGINT", handleSignal);
  process.on("SIGTERM", handleSignal);

  while (!shutdown.value) {
    const job = await claimNextMediaJob(WORKER_ID, { includeBuilds: !capError });
    if (!job) {
      if (capError) {
        capError = assertBuildCapabilities(await getBuildCapabilities());
        if (!capError) {
          console.log(`[${WORKER_ID}] инструменты найдены, обрабатываю очередь`);
        }
      }
      await sleep(POLL_MS);
      continue;
    }

    console.log(`[${WORKER_ID}] running ${job.kind} #${job.id}`);
    const controller = new AbortController();
    const onSignal = () => controller.abort();
    process.once("SIGINT", onSignal);
    process.once("SIGTERM", onSignal);

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
      process.off("SIGINT", onSignal);
      process.off("SIGTERM", onSignal);
    }
  }

  console.log(`[${WORKER_ID}] stopped`);
}

void main();
