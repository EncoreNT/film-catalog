import { createReadStream, createWriteStream } from "node:fs";
import { Transform } from "node:stream";
import { pipeline } from "node:stream/promises";

export interface CopyProgress {
  bytesCopied: number;
  totalBytes: number;
}

export function copyProgressPercent(progress: CopyProgress): number {
  if (progress.totalBytes <= 0) return 0;
  return Math.min(
    100,
    Math.round((progress.bytesCopied / progress.totalBytes) * 1000) / 10,
  );
}

export async function copyFileWithProgress(
  sourcePath: string,
  destPath: string,
  options: {
    totalBytes: number;
    onProgress?: (progress: CopyProgress) => void;
    progressIntervalBytes?: number;
    signal?: AbortSignal;
  },
): Promise<void> {
  const {
    totalBytes,
    onProgress,
    progressIntervalBytes = 32 * 1024 * 1024,
    signal,
  } = options;
  let bytesCopied = 0;
  let lastReport = 0;

  const counter = new Transform({
    transform(chunk, _encoding, callback) {
      bytesCopied += chunk.length;
      if (onProgress && bytesCopied - lastReport >= progressIntervalBytes) {
        lastReport = bytesCopied;
        onProgress({ bytesCopied, totalBytes });
      }
      callback(null, chunk);
    },
    flush(callback) {
      if (onProgress) {
        onProgress({ bytesCopied, totalBytes });
      }
      callback();
    },
  });

  await pipeline(
    createReadStream(sourcePath, { highWaterMark: 4 * 1024 * 1024 }),
    counter,
    createWriteStream(destPath),
    { signal },
  );
}
