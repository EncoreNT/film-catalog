import { describe, expect, it } from "vitest";
import { getResolutionLabel } from "@/lib/shared/resolution";

describe("getResolutionLabel", () => {
  it("classifies standard remux sizes", () => {
    expect(getResolutionLabel(3840, 2160)).toBe("4K");
    expect(getResolutionLabel(1920, 1080)).toBe("1080p");
    expect(getResolutionLabel(1280, 720)).toBe("720p");
  });

  it("classifies slightly cropped BDRip 1080p as 1080p", () => {
    expect(getResolutionLabel(1766, 1070)).toBe("1080p");
    expect(getResolutionLabel(1900, 1078)).toBe("1080p");
  });

  it("classifies slightly cropped 4K as 4K", () => {
    expect(getResolutionLabel(3840, 2156)).toBe("4K");
    expect(getResolutionLabel(3800, 2160)).toBe("4K");
  });

  it("keeps true 720p below 1080p tolerance", () => {
    expect(getResolutionLabel(1280, 718)).toBe("720p");
    expect(getResolutionLabel(1270, 700)).toBe("720p");
  });

  it("does not bump sub-720p crops to 1080p", () => {
    expect(getResolutionLabel(1024, 576)).toBe("480p");
  });

  it("uses width for scope releases (1920x800)", () => {
    expect(getResolutionLabel(1920, 800)).toBe("1080p");
  });
});
