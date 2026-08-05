import { describe, expect, it } from "vitest";
import {
  buildAtempoFilterChain,
  computeFitTempoRatio,
  normalizeAudioSyncMode,
} from "@/lib/builds/build-audio-sync";

describe("build-audio-sync", () => {
  it("infers shift from legacy offsetMs", () => {
    expect(normalizeAudioSyncMode({ offsetMs: -100 })).toBe("shift");
    expect(normalizeAudioSyncMode({ offsetMs: 0 })).toBe("none");
  });

  it("computes tempo as audio over video duration", () => {
    expect(computeFitTempoRatio(7200, 7180)).toBeCloseTo(7180 / 7200, 6);
  });

  it("chains atempo for large stretch factors", () => {
    expect(buildAtempoFilterChain(0.25)).toBe("atempo=0.5,atempo=0.5");
    expect(buildAtempoFilterChain(1.003)).toContain("atempo=");
  });
});
