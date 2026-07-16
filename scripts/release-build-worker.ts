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
  const caps = await getBuildCapabilities();
  const capError = assertBuildCapabilities(caps);
  if (capError) {
    console.error(`[${WORKER_ID}] ${capError}`);
    process.exit(1);
  }

  console.log(`[${WORKER_ID}] started`);

  const shutdown = { value: false };
  const handleSignal = () => {
    shutdown.value = true;
  };
  process.on("SIGINT", handleSignal);
  process.on("SIGTERM", handleSignal);

  while (!shutdown.value) {
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
