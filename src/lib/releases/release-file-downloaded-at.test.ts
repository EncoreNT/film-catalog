import { describe, expect, it } from "vitest";
import { resolveReleaseFileDownloadedAt } from "@/lib/releases/release-file-downloaded-at";

const existing = {
  fileDownloadedAt: new Date("2023-06-01T00:00:00.000Z"),
  fileHash: "aaa",
  fileSize: 1000,
};

const statDate = new Date("2025-01-01T00:00:00.000Z");

describe("resolveReleaseFileDownloadedAt", () => {
  it("uses stat when release has no downloaded date", () => {
    expect(
      resolveReleaseFileDownloadedAt(
        { fileDownloadedAt: null, fileHash: null, fileSize: null },
        statDate,
        "bbb",
        2000,
      ),
    ).toEqual(statDate);
  });

  it("keeps stored date on mtime-only change (same size and hash)", () => {
    expect(
      resolveReleaseFileDownloadedAt(existing, statDate, "aaa", 1000),
    ).toEqual(existing.fileDownloadedAt);
  });

  it("keeps stored date when only hash changes", () => {
    expect(
      resolveReleaseFileDownloadedAt(existing, statDate, "bbb", 1000),
    ).toEqual(existing.fileDownloadedAt);
  });

  it("keeps stored date when only size changes", () => {
    expect(
      resolveReleaseFileDownloadedAt(existing, statDate, "aaa", 2000),
    ).toEqual(existing.fileDownloadedAt);
  });

  it("refreshes from stat when both size and hash change", () => {
    expect(
      resolveReleaseFileDownloadedAt(existing, statDate, "bbb", 2000),
    ).toEqual(statDate);
  });
});
