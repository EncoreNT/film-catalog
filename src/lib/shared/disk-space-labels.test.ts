import { describe, expect, it } from "vitest";
import { formatDiskSpaceFitLabel } from "@/lib/shared/disk-space-labels";

describe("formatDiskSpaceFitLabel", () => {
  it("returns null when free space is enough", () => {
    expect(formatDiskSpaceFitLabel(100 * 1024 ** 3, 60 * 1024 ** 3)).toBeNull();
  });

  it("returns null when free or required bytes are unknown", () => {
    expect(formatDiskSpaceFitLabel(null, 1024)).toBeNull();
    expect(formatDiskSpaceFitLabel(1024, null)).toBeNull();
  });

  it("returns formatted deficit when space is insufficient", () => {
    const free = 50 * 1024 ** 3;
    const required = 63.1 * 1024 ** 3;
    expect(formatDiskSpaceFitLabel(free, required)).toBe("13.1 ГБ");
  });
});
