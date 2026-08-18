/** Sliding window of copy throughput. Samples stay in process memory only. */
export const COPY_SPEED_WINDOW_MS = 12_000;
const MIN_SAMPLE_SPAN_MS = 1_000;

type SpeedSample = {
  at: number;
  bytes: number;
};

export function createCopySpeedWindow(windowMs = COPY_SPEED_WINDOW_MS) {
  const samples: SpeedSample[] = [];

  function prune(now: number) {
    const cutoff = now - windowMs;
    while (samples.length >= 2 && samples[1]!.at <= cutoff) {
      samples.shift();
    }
  }

  function averageBytesPerSecond(now = Date.now()): number | null {
    prune(now);
    if (samples.length < 2) return null;

    const oldest = samples[0]!;
    const newest = samples[samples.length - 1]!;
    const dtMs = newest.at - oldest.at;
    const deltaBytes = newest.bytes - oldest.bytes;
    if (dtMs < MIN_SAMPLE_SPAN_MS || deltaBytes < 0) return null;

    return deltaBytes / (dtMs / 1000);
  }

  return {
    observe(bytesCopied: number, now = Date.now()): number | null {
      const last = samples[samples.length - 1];
      if (last && now <= last.at) {
        last.bytes = Math.max(last.bytes, bytesCopied);
        last.at = Math.max(last.at, now);
        return averageBytesPerSecond(now);
      }

      samples.push({ at: now, bytes: bytesCopied });
      return averageBytesPerSecond(now);
    },
    clear() {
      samples.length = 0;
    },
  };
}
