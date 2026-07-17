import { describe, expect, it } from "vitest";
import type { SerializedBuild } from "@/lib/builds/build-serialize";
import {
  compareBuildsForQueue,
  defaultBuildSectionOpen,
  groupBuildsForDisplay,
  queuedPosition,
  sortBuildsForQueue,
  summarizeBuildQueue,
} from "@/lib/builds/build-queue-display";

function stubBuild(
  partial: Partial<SerializedBuild> & Pick<SerializedBuild, "id" | "status">,
): SerializedBuild {
  return {
    id: partial.id,
    movieId: partial.movieId ?? 1,
    movie: partial.movie ?? {
      id: 1,
      slug: "test",
      title: "Test",
      coverPath: null,
      updatedAt: new Date("2026-07-17T10:00:00.000Z"),
    },
    status: partial.status,
    phase: partial.phase ?? null,
    progressPercent: partial.progressPercent ?? null,
    progressMessage: partial.progressMessage ?? null,
    progressSpeed: partial.progressSpeed ?? null,
    progressOutTimeMs: partial.progressOutTimeMs ?? null,
    progressDurationMs: partial.progressDurationMs ?? null,
    progressStepIndex: partial.progressStepIndex ?? null,
    progressStepTotal: partial.progressStepTotal ?? null,
    errorMessage: partial.errorMessage ?? null,
    cancelRequested: partial.cancelRequested ?? false,
    visualTier: partial.visualTier ?? null,
    spotlightTier: partial.spotlightTier ?? "general",
    outputPath: partial.outputPath ?? "/tmp/out.mkv",
    outputReleaseType: partial.outputReleaseType ?? null,
    outputVersion: partial.outputVersion ?? "theatrical",
    outputReleaseId: partial.outputReleaseId ?? null,
    outputRelease: partial.outputRelease ?? null,
    externalStorage: partial.externalStorage ?? null,
    warnings: partial.warnings ?? [],
    sources: partial.sources ?? [],
    tracks: partial.tracks ?? [],
    startedAt: partial.startedAt ?? null,
    finishedAt: partial.finishedAt ?? null,
    queueOrder: partial.queueOrder ?? partial.id,
    requiresTranscode: partial.requiresTranscode ?? false,
    createdAt: partial.createdAt ?? "2026-07-17T10:00:00.000Z",
    updatedAt: partial.updatedAt ?? "2026-07-17T10:00:00.000Z",
  };
}

describe("sortBuildsForQueue", () => {
  it("orders by status priority then FIFO for queued and recency for archive", () => {
    const items = [
      stubBuild({ id: 8, status: "SUCCEEDED", finishedAt: "2026-07-17T09:00:00.000Z" }),
      stubBuild({ id: 6, status: "FAILED", finishedAt: "2026-07-17T08:00:00.000Z" }),
      stubBuild({ id: 3, status: "QUEUED", createdAt: "2026-07-17T11:00:00.000Z", queueOrder: 2 }),
      stubBuild({ id: 1, status: "RUNNING", startedAt: "2026-07-17T10:30:00.000Z" }),
      stubBuild({ id: 2, status: "QUEUED", createdAt: "2026-07-17T10:10:00.000Z", queueOrder: 0 }),
      stubBuild({ id: 4, status: "RUNNING", startedAt: "2026-07-17T10:00:00.000Z" }),
      stubBuild({ id: 7, status: "CANCELLED", finishedAt: "2026-07-17T07:00:00.000Z" }),
    ];

    expect(sortBuildsForQueue(items).map((b) => b.id)).toEqual([4, 1, 2, 3, 6, 8, 7]);
  });

  it("sorts queued jobs by queueOrder, not createdAt", () => {
    const items = [
      stubBuild({ id: 30, status: "QUEUED", queueOrder: 5, createdAt: "2026-07-17T09:00:00.000Z" }),
      stubBuild({ id: 10, status: "QUEUED", queueOrder: 1, createdAt: "2026-07-17T11:00:00.000Z" }),
      stubBuild({ id: 20, status: "QUEUED", queueOrder: 3, createdAt: "2026-07-17T10:00:00.000Z" }),
    ];
    expect(sortBuildsForQueue(items).map((b) => b.id)).toEqual([10, 20, 30]);
  });

  it("sorts running jobs by startedAt ascending (longest active first)", () => {
    const a = stubBuild({ id: 1, status: "RUNNING", startedAt: "2026-07-17T10:00:00.000Z" });
    const b = stubBuild({ id: 2, status: "RUNNING", startedAt: "2026-07-17T11:00:00.000Z" });
    expect(compareBuildsForQueue(a, b)).toBeLessThan(0);
  });
});

describe("groupBuildsForDisplay", () => {
  it("creates non-empty sections in queue order", () => {
    const items = [
      stubBuild({ id: 1, status: "RUNNING" }),
      stubBuild({ id: 2, status: "QUEUED", createdAt: "2026-07-17T09:00:00.000Z" }),
      stubBuild({ id: 3, status: "FAILED" }),
    ];

    const sections = groupBuildsForDisplay(items);
    expect(sections.map((s) => s.id)).toEqual(["running", "queued", "failed"]);
    expect(sections[1]?.items.map((b) => b.id)).toEqual([2]);
  });
});

describe("defaultBuildSectionOpen", () => {
  it("keeps active sections open and archive collapsed", () => {
    expect(defaultBuildSectionOpen("running")).toBe(true);
    expect(defaultBuildSectionOpen("queued")).toBe(true);
    expect(defaultBuildSectionOpen("failed")).toBe(true);
    expect(defaultBuildSectionOpen("archive")).toBe(false);
  });
});

describe("queuedPosition", () => {
  it("returns 1-based FIFO index among queued builds", () => {
    const items = [
      stubBuild({ id: 10, status: "QUEUED", createdAt: "2026-07-17T09:00:00.000Z" }),
      stubBuild({ id: 11, status: "QUEUED", createdAt: "2026-07-17T10:00:00.000Z" }),
      stubBuild({ id: 12, status: "RUNNING" }),
    ];

    expect(queuedPosition(items[0]!, items)).toBe(1);
    expect(queuedPosition(items[1]!, items)).toBe(2);
    expect(queuedPosition(items[2]!, items)).toBeNull();
  });

  it("counts position within the same queue lane", () => {
    const items = [
      stubBuild({ id: 10, status: "QUEUED", queueOrder: 0, requiresTranscode: true }),
      stubBuild({ id: 11, status: "QUEUED", queueOrder: 0, requiresTranscode: false }),
      stubBuild({ id: 12, status: "QUEUED", queueOrder: 1, requiresTranscode: false }),
    ];

    expect(queuedPosition(items[0]!, items)).toBe(1);
    expect(queuedPosition(items[1]!, items)).toBe(1);
    expect(queuedPosition(items[2]!, items)).toBe(2);
  });
});

describe("summarizeBuildQueue", () => {
  it("counts active as running plus queued", () => {
    const summary = summarizeBuildQueue([
      stubBuild({ id: 1, status: "RUNNING" }),
      stubBuild({ id: 2, status: "QUEUED" }),
      stubBuild({ id: 3, status: "SUCCEEDED" }),
    ]);

    expect(summary).toMatchObject({
      total: 3,
      running: 1,
      queued: 1,
      active: 2,
      succeeded: 1,
    });
  });
});
