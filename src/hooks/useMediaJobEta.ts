"use client";

import { useEffect, useState } from "react";
import {
  estimateMediaJobRemainingSeconds,
  mediaJobRunningEtaLabelFromSeconds,
  type MediaJobEtaInput,
} from "@/lib/media-jobs/job-eta";

/** Live countdown from the last known copy progress (decays between polls). */
export function useMediaJobEtaLabel(
  job: MediaJobEtaInput | null | undefined,
): string | null {
  const running = job?.status === "RUNNING";
  const [now, setNow] = useState(() => Date.now());
  const [snapshot, setSnapshot] = useState<{
    remaining: number | null;
    at: number;
  } | null>(null);

  useEffect(() => {
    if (!running || !job) {
      setSnapshot(null);
      return;
    }
    const observedAt = Date.now();
    setSnapshot({
      remaining: estimateMediaJobRemainingSeconds(job, observedAt),
      at: observedAt,
    });
  }, [running, job]);

  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [running]);

  if (!snapshot || snapshot.remaining == null) return null;

  const decayed = Math.max(
    0,
    snapshot.remaining - Math.max(0, now - snapshot.at) / 1000,
  );
  return mediaJobRunningEtaLabelFromSeconds(decayed);
}
