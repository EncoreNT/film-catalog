#!/usr/bin/env tsx
import "dotenv/config";
import { claimNextBuild, recoverStaleBuilds } from "../src/lib/builds/build-queue";
import { runBuildJob } from "../src/lib/builds/build-runner";
import {
  assertBuildCapabilities,
  getBuildCapabilities,
} from "../src/lib/builds/build-capabilities";

const WORKER_ID = `build-worker-${process.pid}`;
const POLL_MS = 2_000;

async function sleep(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  let capError = assertBuildCapabilities(await getBuildCapabilities());
  if (capError) {
    console.warn(
      `[${WORKER_ID}] ${capError} — сборки отключены, каталог работает; установите ffmpeg/ffprobe/mkvmerge или перезапустите worker`,
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
    if (capError) {
      await sleep(POLL_MS);
      capError = assertBuildCapabilities(await getBuildCapabilities());
      if (!capError) {
        console.log(`[${WORKER_ID}] инструменты найдены, обрабатываю очередь сборок`);
      }
      continue;
    }

    await recoverStaleBuilds();
    const job = await claimNextBuild(WORKER_ID);
    if (!job) {
      await sleep(POLL_MS);
      continue;
    }

    console.log(`[${WORKER_ID}] running build #${job.id}`);
    const controller = new AbortController();
    const onSignal = () => controller.abort();
    process.once("SIGINT", onSignal);
    process.once("SIGTERM", onSignal);

    try {
      await runBuildJob(job.id, controller.signal);
      console.log(`[${WORKER_ID}] finished build #${job.id}`);
    } catch (err) {
      console.error(`[${WORKER_ID}] build #${job.id} failed`, err);
    } finally {
      process.off("SIGINT", onSignal);
      process.off("SIGTERM", onSignal);
    }
  }

  console.log(`[${WORKER_ID}] stopped`);
}

void main();
