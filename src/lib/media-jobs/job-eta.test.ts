import { describe, expect, it } from "vitest";
import { createMediaJobEtaEstimator, estimateMediaJobRemainingSeconds, mediaJobRunningEtaLabel, mediaJobRunningEtaLabelFromSeconds, type MediaJobEtaInput } from "@/lib/media-jobs/job-eta";

const START = Date.parse("2026-11-08T09:00:00Z");
const NOW = START + 60_000;
const MB = 1024 * 1024;
function job(partial: Partial<MediaJobEtaInput> = {}): MediaJobEtaInput {
  return { id: 1, status: "RUNNING", phase: "copying", progressPercent: 50,
    progressSpeed: 50 * MB, sourceFileSize: 10 * 1024 * MB,
    startedAt: new Date(START).toISOString(), ...partial };
}

function warmed() {
  const estimator = createMediaJobEtaEstimator();
  estimator.observe(job(), NOW);
  estimator.observe(job({ progressPercent: 51 }), NOW + 3000);
  estimator.observe(job({ progressPercent: 52 }), NOW + 6000);
  return estimator;
}

describe("estimateMediaJobRemainingSeconds", () => {
  it("estimates remaining bytes using measured speed", () => {
    expect(estimateMediaJobRemainingSeconds(job(), NOW)).toBe(102);
  });
  it("waits through the initial write-cache burst", () => {
    expect(estimateMediaJobRemainingSeconds(job(), START + 2000)).toBeNull();
  });
  it("supports elapsed-time fallback only when speed is absent", () => {
    expect(estimateMediaJobRemainingSeconds(job({ progressSpeed: null }), NOW)).toBe(60);
    expect(estimateMediaJobRemainingSeconds(job({ progressSpeed: 0 }), NOW)).toBeNull();
    expect(estimateMediaJobRemainingSeconds(job({ progressSpeed: -1 }), NOW)).toBeNull();
  });
  it.each(["QUEUED", "SUCCEEDED", "FAILED", "CANCELLED"] as const)("has no ETA for %s", (status) => {
    expect(estimateMediaJobRemainingSeconds(job({ status }), NOW)).toBeNull();
  });
  it.each(["moving", "updating", "register", null])("does not invent a time for phase %s", (phase) => {
    expect(estimateMediaJobRemainingSeconds(job({ phase }), NOW)).toBeNull();
  });
  it.each([0, -1, NaN, Infinity, 100])("rejects unsuitable progress %s", (progressPercent) => {
    expect(estimateMediaJobRemainingSeconds(job({ progressPercent }), NOW)).toBeNull();
  });
  it("can use byte rate without a start timestamp", () => {
    expect(estimateMediaJobRemainingSeconds(job({ startedAt: null }), NOW)).toBe(102);
  });
  it("does not estimate cancellation", () => {
    expect(estimateMediaJobRemainingSeconds(job({ cancelRequested: true }), NOW)).toBeNull();
  });
});

describe("createMediaJobEtaEstimator", () => {
  it("warms up then shows a ten-second estimate", () => {
    const estimator = createMediaJobEtaEstimator();
    estimator.observe(job(), NOW);
    expect(estimator.label(NOW)).toBe("Оцениваем время…");
    expect(warmed().label(NOW + 6000)).toBe("осталось ~1 мин 40 с");
  });
  it("does not reset the countdown on repeated API responses or heartbeats", () => {
    const estimator = warmed();
    const remaining = estimator.remainingSeconds(NOW + 6000)!;
    estimator.observe({ ...job({ progressPercent: 52 }) }, NOW + 9000);
    expect(estimator.remainingSeconds(NOW + 9000)).toBeCloseTo(remaining - 3);
    estimator.observe(job({ progressPercent: 52 }), NOW + 24000);
    expect(estimator.remainingSeconds(NOW + 24000)).toBeNull();
    expect(estimator.label(NOW + 24000)).toBe("Уточняем время…");
  });
  it("hides stale estimates even if polling stops entirely", () => {
    const estimator = warmed();
    expect(estimator.label(NOW + 60000)).toBe("Уточняем время…");
  });
  it("smooths alternating speed bursts while retaining real progress", () => {
    const estimator = createMediaJobEtaEstimator();
    const smooth: number[] = [], raw: number[] = [];
    let percent = 20;
    for (let t = 0; t <= 120; t += 3) {
      const speed = (t % 6 === 0 ? 20 : 80) * MB;
      percent += (speed * 3 / (100 * 1024 * MB)) * 100;
      const sample = job({ sourceFileSize: 100 * 1024 * MB, progressPercent: percent, progressSpeed: speed });
      estimator.observe(sample, NOW + t * 1000);
      if (t >= 90) {
        smooth.push(estimator.remainingSeconds(NOW + t * 1000)!);
        raw.push(estimateMediaJobRemainingSeconds(sample, NOW + t * 1000)!);
      }
    }
    const spread = (values: number[]) => Math.max(...values) - Math.min(...values);
    expect(spread(smooth)).toBeLessThan(spread(raw) * 0.1);
  });
  it("adapts to a sustained slowdown instead of freezing an optimistic forecast", () => {
    const estimator = warmed();
    const before = estimator.remainingSeconds(NOW + 6000)!;
    for (let t = 9; t <= 66; t += 3) {
      estimator.observe(job({ progressPercent: 52 + (t - 6) / 20, progressSpeed: 10 * MB }), NOW + t * 1000);
    }
    const raw = estimateMediaJobRemainingSeconds(job({ progressPercent: 55, progressSpeed: 10 * MB }), NOW + 66000)!;
    const smoothed = estimator.remainingSeconds(NOW + 66000)!;
    expect(smoothed).toBeGreaterThan(before * 3);
    expect(smoothed).toBeGreaterThan(raw * 0.8);
    expect(smoothed).toBeLessThan(raw * 1.1);
  });
  it("does not accumulate the same sample repeatedly at faster polling rates", () => {
    const sparse = warmed(), frequent = warmed();
    for (let t = 7; t <= 9; t++) frequent.observe(job({ progressPercent: 52 }), NOW + t * 1000);
    const next = job({ progressPercent: 53, progressSpeed: 20 * MB });
    sparse.observe(next, NOW + 10000);
    frequent.observe(next, NOW + 10000);
    expect(frequent.remainingSeconds(NOW + 10000)).toBe(sparse.remainingSeconds(NOW + 10000));
  });
  it.each([
    { id: 2 },
    { startedAt: new Date(NOW + 7000).toISOString() },
    { progressPercent: 1 },
  ])("resets on a new operation/retry: %j", (change) => {
    const estimator = warmed();
    estimator.observe(job({ progressPercent: 53, ...change }), NOW + 7000);
    expect(estimator.label(NOW + 7000)).toBe("Оцениваем время…");
  });
  it("recalibrates after a stall and never uses a zero-speed fallback", () => {
    const estimator = warmed();
    estimator.observe(job({ progressPercent: 52, progressSpeed: 0 }), NOW + 9000);
    expect(estimator.remainingSeconds(NOW + 9000)).toBeNull();
    estimator.observe(job({ progressPercent: 53, progressSpeed: 20 * MB }), NOW + 60000);
    expect(estimator.label(NOW + 60000)).toBe("Оцениваем время…");
  });
  it("shows completion as a phase, not a repeating eight-second promise", () => {
    const estimator = warmed();
    estimator.observe(job({ phase: "updating", progressPercent: 99 }), NOW + 10000);
    expect(estimator.label(NOW + 10000)).toBe("Завершение…");
    expect(estimator.label(NOW + 60000)).toBe("Завершение…");
    estimator.observe(job({ status: "SUCCEEDED" }), NOW + 61000);
    expect(estimator.label(NOW + 61000)).toBeNull();
  });
  it("clears the displayed forecast on cancellation and removal", () => {
    const estimator = warmed();
    estimator.observe(job({ cancelRequested: true }), NOW + 7000);
    expect(estimator.label(NOW + 7000)).toBeNull();
    estimator.observe(null, NOW + 8000);
    expect(estimator.label(NOW + 8000)).toBeNull();
  });
});

describe("media job ETA labels", () => {
  it("avoids second-by-second false precision", () => {
    expect(mediaJobRunningEtaLabelFromSeconds(301)).toBe("осталось ~5 мин");
    expect(mediaJobRunningEtaLabelFromSeconds(309)).toBe("осталось ~5 мин 10 с");
    expect(mediaJobRunningEtaLabelFromSeconds(59)).toBe("осталось ~1 мин");
    expect(mediaJobRunningEtaLabelFromSeconds(NaN)).toBeNull();
    expect(mediaJobRunningEtaLabel(job(), NOW)).toBe("осталось ~1 мин 40 с");
  });
});
