import { describe, expect, it } from "vitest";
import { fileDownloadedAtFromStat } from "@/lib/shared/file-downloaded-at";

describe("fileDownloadedAtFromStat", () => {
  it("prefers birthtime when valid", () => {
    const birthtime = new Date("2024-03-01T10:00:00.000Z");
    const mtime = new Date("2024-06-01T12:00:00.000Z");
    expect(fileDownloadedAtFromStat({ birthtime, mtime })).toEqual(birthtime);
  });

  it("falls back to mtime when birthtime is epoch", () => {
    const birthtime = new Date(0);
    const mtime = new Date("2024-06-01T12:00:00.000Z");
    expect(fileDownloadedAtFromStat({ birthtime, mtime })).toEqual(mtime);
  });
});
