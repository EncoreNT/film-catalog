import { describe, expect, it } from "vitest";
import { createCopySpeedWindow } from "@/lib/media-jobs/copy-speed-window";

describe("createCopySpeedWindow", () => {
  it("returns null until two samples span at least a second", () => {
    const window = createCopySpeedWindow(12_000);
    expect(window.observe(0, 0)).toBeNull();
    expect(window.observe(8_000, 500)).toBeNull();
  });

  it("averages throughput over the last 12 seconds, not the whole copy", () => {
    const window = createCopySpeedWindow(12_000);
    window.observe(0, 0);
    // Fast start: 200 MB/s for 4s.
    window.observe(800 * 1024 * 1024, 4_000);
    // Then 40 MB/s for 12s.
    const speed = window.observe(800 * 1024 * 1024 + 480 * 1024 * 1024, 16_000);

    // Window is t=4s..16s → 480 MB / 12s = 40 MB/s, not the 80 MB/s lifetime average.
    expect(speed).toBeCloseTo(40 * 1024 * 1024, 0);
  });

  it("forgets samples after clear", () => {
    const window = createCopySpeedWindow(12_000);
    window.observe(0, 0);
    window.observe(50 * 1024 * 1024, 2_000);
    window.clear();
    expect(window.observe(0, 3_000)).toBeNull();
  });
});
