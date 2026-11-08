"use client";

import { useEffect, useRef, useState } from "react";
import { createMediaJobEtaEstimator, type MediaJobEtaInput } from "@/lib/media-jobs/job-eta";

/** Owned by the job hook, shared by its strip and dialog; all calculations live in the tested domain helper. */
export function useMediaJobEtaLabel(job: MediaJobEtaInput | null | undefined): string | null {
  const estimator = useRef(createMediaJobEtaEstimator());
  const [label, setLabel] = useState<string | null>(null);
  const running = job?.status === "RUNNING";

  useEffect(() => {
    const now = Date.now();
    estimator.current.observe(job, now);
    setLabel(estimator.current.label(now));
  }, [job]);

  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(() => setLabel(estimator.current.label(Date.now())), 1000);
    return () => window.clearInterval(timer);
  }, [running]);

  return running ? label : null;
}
