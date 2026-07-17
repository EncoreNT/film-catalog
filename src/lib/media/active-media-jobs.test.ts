import { describe, expect, it } from "vitest";
import type { SerializedBuild } from "@/lib/builds/build-serialize";
import type { SerializedExport } from "@/lib/releases/export-serialize";
import {
  sortActiveMediaJobs,
  summarizeActiveMediaJobs,
} from "@/lib/media/active-media-jobs";

function stubBuild(
  overrides: Partial<SerializedBuild> & Pick<SerializedBuild, "id" | "status">,
): SerializedBuild {
  return {
    movieId: 1,
    movie: {
      id: 1,
      slug: "test",
      title: "Test",
      coverPath: null,
      updatedAt: new Date("2026-07-17T10:00:00.000Z"),
    },
    outputPath: "/out/test.mkv",
    outputReleaseId: null,
    outputReleaseType: null,
    outputVersion: "",
    outputRelease: null,
    externalStorage: null,
    phase: null,
    progressPercent: null,
    progressMessage: null,
    progressSpeed: null,
    progressOutTimeMs: null,
    progressDurationMs: null,
    progressStepIndex: null,
    progressStepTotal: null,
    errorMessage: null,
    cancelRequested: false,
    queueOrder: 0,
    requiresTranscode: false,
    warnings: [],
    startedAt: null,
    finishedAt: null,
    createdAt: "2026-07-17T10:00:00.000Z",
    updatedAt: "2026-07-17T10:00:00.000Z",
    visualTier: null,
    spotlightTier: "general",
    tracks: [],
    sources: [],
    ...overrides,
  };
}

function stubExport(
  overrides: Partial<SerializedExport> & Pick<SerializedExport, "id" | "status">,
): SerializedExport {
  return {
    movieId: 1,
    releaseId: 10,
    movie: {
      id: 1,
      slug: "test",
      title: "Test",
      coverPath: null,
      updatedAt: new Date("2026-07-17T10:00:00.000Z"),
    },
    release: {} as SerializedExport["release"],
    phase: null,
    progressPercent: null,
    progressMessage: null,
    progressSpeed: null,
    sourceFilePath: "/src/test.mkv",
    sourceFileSize: 1_000_000,
    targetPath: "/dst/test.mkv",
    targetPathDisplay: "/dst/test.mkv",
    targetFilename: "test.mkv",
    errorMessage: null,
    cancelRequested: false,
    queueOrder: 0,
    startedAt: null,
    finishedAt: null,
    createdAt: "2026-07-17T10:00:00.000Z",
    updatedAt: "2026-07-17T10:00:00.000Z",
    ...overrides,
  };
}

describe("sortActiveMediaJobs", () => {
  it("orders running jobs before queued and respects queue order", () => {
    const builds = [
      stubBuild({ id: 2, status: "QUEUED", queueOrder: 1 }),
      stubBuild({
        id: 1,
        status: "RUNNING",
        startedAt: "2026-07-17T10:30:00.000Z",
      }),
    ];
    const exports = [
      stubExport({ id: 3, status: "QUEUED", queueOrder: 0 }),
      stubExport({
        id: 4,
        status: "RUNNING",
        startedAt: "2026-07-17T10:00:00.000Z",
      }),
    ];

    const sorted = sortActiveMediaJobs(builds, exports);

    expect(sorted.map((entry) => `${entry.kind}:${entry.job.id}`)).toEqual([
      "export:4",
      "build:1",
      "export:3",
      "build:2",
    ]);
  });
});

describe("summarizeActiveMediaJobs", () => {
  it("counts running and queued jobs", () => {
    const summary = summarizeActiveMediaJobs(
      [
        stubBuild({ id: 1, status: "RUNNING" }),
        stubBuild({ id: 2, status: "QUEUED" }),
      ],
      [stubExport({ id: 3, status: "QUEUED" })],
    );

    expect(summary).toEqual({ total: 3, running: 1, queued: 2 });
  });
});
