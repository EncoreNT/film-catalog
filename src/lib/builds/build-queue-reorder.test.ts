import { describe, expect, it } from "vitest";
import type { SerializedBuild } from "@/lib/builds/build-serialize";
import {
  applyQueuedOrderToItems,
  moveQueuedBuild,
  queuedBuildIds,
  reorderQueuedIds,
} from "@/lib/builds/build-queue-reorder";

function stubQueued(id: number, queueOrder: number): SerializedBuild {
  return {
    id,
    movieId: 1,
    movie: {
      id: 1,
      slug: "test",
      title: "Test",
      coverPath: null,
      updatedAt: new Date("2026-07-17T10:00:00.000Z"),
    },
    status: "QUEUED",
    phase: null,
    progressPercent: null,
    progressMessage: null,
    errorMessage: null,
    cancelRequested: false,
    visualTier: null,
    spotlightTier: "general",
    outputPath: "/tmp/out.mkv",
    outputReleaseType: null,
    outputVersion: "theatrical",
    outputReleaseId: null,
    outputRelease: null,
    externalStorage: null,
    warnings: [],
    sources: [],
    tracks: [],
    startedAt: null,
    finishedAt: null,
    queueOrder,
    createdAt: "2026-07-17T10:00:00.000Z",
    updatedAt: "2026-07-17T10:00:00.000Z",
  };
}

describe("reorderQueuedIds", () => {
  it("moves an id to a new index", () => {
    expect(reorderQueuedIds([10, 11, 12], 12, 0)).toEqual([12, 10, 11]);
  });

  it("returns null for invalid targets", () => {
    expect(reorderQueuedIds([10, 11], 99, 0)).toBeNull();
    expect(reorderQueuedIds([10, 11], 10, 5)).toBeNull();
  });
});

describe("moveQueuedBuild", () => {
  it("moves up and down by one", () => {
    expect(moveQueuedBuild([10, 11, 12], 11, "up")).toEqual([11, 10, 12]);
    expect(moveQueuedBuild([10, 11, 12], 11, "down")).toEqual([10, 12, 11]);
  });
});

describe("applyQueuedOrderToItems", () => {
  it("updates queueOrder only for queued builds in the list", () => {
    const items = [stubQueued(10, 0), stubQueued(11, 1), stubQueued(12, 2)];
    const next = applyQueuedOrderToItems(items, [12, 10, 11]);
    expect(next.map((b) => [b.id, b.queueOrder])).toEqual([
      [10, 1],
      [11, 2],
      [12, 0],
    ]);
  });
});

describe("queuedBuildIds", () => {
  it("returns queued ids sorted by queueOrder", () => {
    const ids = queuedBuildIds([
      stubQueued(12, 2),
      stubQueued(10, 0),
      { ...stubQueued(99, 0), status: "RUNNING" },
      stubQueued(11, 1),
    ]);
    expect(ids).toEqual([10, 11, 12]);
  });
});
