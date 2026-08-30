import { describe, expect, it } from "vitest";
import { shouldSkipScanDir } from "@/lib/media/scan-skip-dirs";

describe("shouldSkipScanDir", () => {
  it("skips Blu-ray tree names case-insensitively", () => {
    expect(shouldSkipScanDir("BDMV")).toBe(true);
    expect(shouldSkipScanDir("STREAM")).toBe(true);
    expect(shouldSkipScanDir("playlist")).toBe(true);
    expect(shouldSkipScanDir("CLIPINF")).toBe(true);
    expect(shouldSkipScanDir("BACKUP")).toBe(true);
    expect(shouldSkipScanDir("CERTIFICATE")).toBe(true);
    expect(shouldSkipScanDir("AACS")).toBe(true);
  });

  it("skips hidden directories", () => {
    expect(shouldSkipScanDir(".hidden")).toBe(true);
  });

  it("allows ordinary movie folders", () => {
    expect(shouldSkipScanDir("Movies")).toBe(false);
    expect(shouldSkipScanDir("The Foreigner")).toBe(false);
  });
});
