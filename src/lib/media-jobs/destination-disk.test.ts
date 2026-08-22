import { describe, expect, it } from "vitest";
import {
  destinationDiskKey,
  selectClaimableCopyJobs,
  type CopyJobCandidate,
} from "@/lib/media-jobs/destination-disk";

describe("destinationDiskKey", () => {
  it("uses the WSL drive letter as the destination identity", () => {
    expect(destinationDiskKey("/mnt/f/TV/Movies/film.mkv")).toBe("wsl:F");
  });

  it("normalizes a Windows path to the same drive key", () => {
    expect(destinationDiskKey("F:\\TV\\Movies\\film.mkv")).toBe("wsl:F");
  });

  it("treats different folders on the same drive as one disk", () => {
    expect(destinationDiskKey("/mnt/d/TV/a.mkv")).toBe(
      destinationDiskKey("/mnt/d/Archive/b.mkv"),
    );
  });

  it("distinguishes different Windows drives", () => {
    expect(destinationDiskKey("/mnt/d/a.mkv")).not.toBe(
      destinationDiskKey("/mnt/e/a.mkv"),
    );
  });

  it("collapses non-Windows destinations onto a local lane", () => {
    expect(destinationDiskKey("/home/encore/tv/a.mkv")).toBe("local");
    expect(destinationDiskKey("/mnt/data/movies/a.mkv")).toBe("local");
  });
});

function job(
  partial: Pick<CopyJobCandidate, "kind" | "id" | "targetPath"> & {
    createdAt?: string;
  },
): CopyJobCandidate {
  return {
    ...partial,
    createdAt: new Date(partial.createdAt ?? "2026-08-22T10:00:00.000Z"),
  };
}

describe("selectClaimableCopyJobs", () => {
  it("starts one job per destination disk and leaves the rest queued", () => {
    const selected = selectClaimableCopyJobs(
      [
        job({
          kind: "export",
          id: 1,
          targetPath: "/mnt/f/TV/a.mkv",
          createdAt: "2026-08-22T10:00:00.000Z",
        }),
        job({
          kind: "move",
          id: 2,
          targetPath: "/mnt/f/Archive/b.mkv",
          createdAt: "2026-08-22T10:01:00.000Z",
        }),
        job({
          kind: "export",
          id: 3,
          targetPath: "/mnt/d/TV/c.mkv",
          createdAt: "2026-08-22T10:02:00.000Z",
        }),
      ],
      new Set(),
    );

    expect(selected.map((item) => item.id)).toEqual([1, 3]);
  });

  it("serializes export and move onto the same destination disk", () => {
    const selected = selectClaimableCopyJobs(
      [
        job({
          kind: "export",
          id: 1,
          targetPath: "/mnt/f/TV/a.mkv",
        }),
        job({
          kind: "move",
          id: 2,
          targetPath: "F:\\Archive\\b.mkv",
        }),
      ],
      new Set(),
    );

    expect(selected.map((item) => `${item.kind}:${item.id}`)).toEqual([
      "export:1",
    ]);
  });

  it("does not claim a disk that already has a running copy", () => {
    const selected = selectClaimableCopyJobs(
      [
        job({
          kind: "move",
          id: 2,
          targetPath: "/mnt/f/Archive/b.mkv",
        }),
        job({
          kind: "export",
          id: 3,
          targetPath: "/mnt/d/TV/c.mkv",
        }),
      ],
      new Set(["wsl:F"]),
    );

    expect(selected.map((item) => item.id)).toEqual([3]);
  });

  it("picks the oldest job first even when a later move is a different kind", () => {
    const selected = selectClaimableCopyJobs(
      [
        job({
          kind: "export",
          id: 10,
          targetPath: "/mnt/f/TV/a.mkv",
          createdAt: "2026-08-22T10:02:00.000Z",
        }),
        job({
          kind: "move",
          id: 4,
          targetPath: "/mnt/f/Archive/b.mkv",
          createdAt: "2026-08-22T10:00:00.000Z",
        }),
      ],
      new Set(),
    );

    expect(selected.map((item) => `${item.kind}:${item.id}`)).toEqual(["move:4"]);
  });

  it("skips a blocked disk and still claims a later job on a free disk", () => {
    const selected = selectClaimableCopyJobs(
      [
        job({
          kind: "export",
          id: 1,
          targetPath: "/mnt/f/TV/a.mkv",
          createdAt: "2026-08-22T10:00:00.000Z",
        }),
        job({
          kind: "move",
          id: 2,
          targetPath: "/mnt/f/Archive/b.mkv",
          createdAt: "2026-08-22T10:01:00.000Z",
        }),
        job({
          kind: "move",
          id: 3,
          targetPath: "/mnt/e/Keep/c.mkv",
          createdAt: "2026-08-22T10:02:00.000Z",
        }),
      ],
      new Set(),
    );

    expect(selected.map((item) => item.id)).toEqual([1, 3]);
  });
});
