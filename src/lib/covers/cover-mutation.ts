import { mkdir } from "node:fs/promises";
import lockfile from "proper-lockfile";
import { dataPath } from "@/lib/db/data-path";

/** Serialize file writes, committed reference changes and cleanup across processes. */
export async function withCoverMutation<T>(action: () => Promise<T>): Promise<T> {
  await mkdir(dataPath("covers"), { recursive: true });
  const release = await lockfile.lock(dataPath("covers", ".cover-mutation"), {
    realpath: false, stale: 120_000, update: 10_000,
    retries: { retries: 100, minTimeout: 50, maxTimeout: 300, factor: 1.2 },
  });
  try { return await action(); }
  finally { await release(); }
}
