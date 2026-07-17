import { describe, expect, it } from "vitest";
import { parseFfmpegSpeed } from "@/lib/builds/build-ffmpeg";
import {
  buildQueuedEtaLabel,
  buildRunningEtaLabel,
  estimateQueuedWaitSeconds,
  estimateRecipeDurationSeconds,
  estimateRunningRemainingSeconds,
  formatBuildEtaSeconds,
} from "@/lib/builds/build-eta";
import type { SerializedBuild } from "@/lib/builds/build-serialize";

function baseBuild(
  partial: Partial<SerializedBuild> & Pick<SerializedBuild, "id" | "status">,
): SerializedBuild {
  return {
    id: partial.id,
    movieId: 1,
    movie: {
      id: 1,
      slug: "alita",
      title: "Alita",
      coverPath: null,
      updatedAt: new Date("2026-01-01T00:00:00.000Z"),
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
    errorMessage: null,
    cancelRequested: false,
    outputPath: "/tmp/out.mkv",
    outputReleaseType: "bdremux",
    outputVersion: "theatrical",
    outputReleaseId: null,
    outputRelease: null,
    externalStorage: null,
    warnings: [],
    visualTier: null,
    spotlightTier: "general",
    sources: partial.sources ?? [
      {
        id: 1,
        releaseId: 1,
        filePath: "/in.mkv",
        durationSeconds: 7200,
        role: "video",
        release: { durationSeconds: 7200 } as SerializedBuild["sources"][number]["release"],
      },
    ],
    tracks:
      partial.tracks ??
      [
        {
          id: 1,
          sortOrder: 0,
          kind: "VIDEO",
          sourceReleaseId: 1,
          sourceStreamIndex: 0,
          sourceFilePath: "/in.mkv",
          sourceTrackLabel: "Video",
          audioMode: null,
          transcodeCodec: null,
          transcodeBitrate: null,
          channelTarget: null,
          offsetMs: 0,
          isDefault: false,
          forced: false,
          keepOriginal: false,
        },
        {
          id: 2,
          sortOrder: 1,
          kind: "AUDIO",
          sourceReleaseId: 1,
          sourceStreamIndex: 1,
          sourceFilePath: "/in.mkv",
          sourceTrackLabel: "Eng",
          audioMode: "TRANSCODE",
          transcodeCodec: "eac3",
          transcodeBitrate: 768,
          channelTarget: "UP_TO_51",
          offsetMs: 0,
          isDefault: false,
          forced: false,
          keepOriginal: false,
        },
      ],
    startedAt: partial.startedAt ?? "2026-01-01T10:00:00.000Z",
    finishedAt: null,
    queueOrder: partial.queueOrder ?? 0,
    requiresTranscode: partial.requiresTranscode ?? false,
    createdAt: "2026-01-01T09:00:00.000Z",
    updatedAt: partial.updatedAt ?? "2026-01-01T10:05:00.000Z",
  } satisfies SerializedBuild;
}

describe("parseFfmpegSpeed", () => {
  it("parses ffmpeg speed strings", () => {
    expect(parseFfmpegSpeed("1.05x")).toBe(1.05);
    expect(parseFfmpegSpeed("0.98")).toBe(0.98);
    expect(parseFfmpegSpeed("N/A")).toBeNull();
  });
});

describe("formatBuildEtaSeconds", () => {
  it("formats short and long durations in Russian", () => {
    expect(formatBuildEtaSeconds(30)).toBe("меньше минуты");
    expect(formatBuildEtaSeconds(125)).toBe("~2 мин 5 с");
    expect(formatBuildEtaSeconds(900)).toBe("~15 мин");
    expect(formatBuildEtaSeconds(5400)).toBe("~1 ч 30 мин");
  });
});

describe("estimateRunningRemainingSeconds", () => {
  it("uses ffmpeg telemetry during transcode", () => {
    const remaining = estimateRunningRemainingSeconds(
      baseBuild({
        id: 1,
        status: "RUNNING",
        phase: "transcode",
        progressDurationMs: 7_200_000,
        progressOutTimeMs: 3_600_000,
        progressSpeed: 2,
        progressStepIndex: 0,
        progressStepTotal: 1,
      }),
    );

    expect(remaining).toBeGreaterThan(120);
    expect(remaining).toBeLessThan(7200);
  });

  it("extrapolates transcode eta between worker updates", () => {
    const snapshot = baseBuild({
      id: 1,
      status: "RUNNING",
      phase: "transcode",
      progressDurationMs: 7_200_000,
      progressOutTimeMs: 3_600_000,
      progressSpeed: 16,
      progressStepIndex: 0,
      progressStepTotal: 1,
      updatedAt: new Date("2026-01-01T10:05:00.000Z").toISOString(),
    });
    const later = estimateRunningRemainingSeconds(
      snapshot,
      Date.parse("2026-01-01T10:06:00.000Z"),
    );
    const earlier = estimateRunningRemainingSeconds(
      snapshot,
      Date.parse("2026-01-01T10:05:00.000Z"),
    );
    expect(later).not.toBeNull();
    expect(earlier).not.toBeNull();
    expect(later!).toBeLessThan(earlier!);
  });

  it("estimates mux from progress percent", () => {
    const remaining = estimateRunningRemainingSeconds(
      baseBuild({
        id: 1,
        status: "RUNNING",
        phase: "mux",
        progressPercent: 75,
      }),
    );

    expect(remaining).toBeGreaterThan(40);
    expect(remaining).toBeLessThan(200);
  });

  it("scales mux eta by film duration at phase start", () => {
    const remaining = estimateRunningRemainingSeconds(
      baseBuild({
        id: 1,
        status: "RUNNING",
        phase: "mux",
        progressPercent: 60,
        progressMessage: "Сборка MKV",
        progressOutTimeMs: Date.parse("2026-01-01T10:00:00.000Z"),
        updatedAt: "2026-01-01T10:00:00.000Z",
      }),
      Date.parse("2026-01-01T10:00:00.000Z"),
    );

    // 2h film → mux budget 60s + finalize 45s
    expect(remaining).toBeGreaterThan(90);
    expect(remaining).toBeLessThan(120);
  });

  it("counts down mux eta between worker updates", () => {
    const muxStartedMs = Date.parse("2026-01-01T10:00:00.000Z");
    const snapshot = baseBuild({
      id: 1,
      status: "RUNNING",
      phase: "mux",
      progressPercent: 60,
      progressMessage: "Сборка MKV",
      progressOutTimeMs: muxStartedMs,
      updatedAt: "2026-01-01T10:00:00.000Z",
    });
    const early = estimateRunningRemainingSeconds(
      snapshot,
      muxStartedMs,
    );
    const late = estimateRunningRemainingSeconds(
      snapshot,
      muxStartedMs + 60_000,
    );
    expect(early).not.toBeNull();
    expect(late).not.toBeNull();
    expect(late!).toBeLessThan(early!);
    expect(early! - late!).toBeGreaterThanOrEqual(60);
  });

  it("uses mkv sub-progress from progress message", () => {
    const muxStartedMs = Date.parse("2026-01-01T10:00:00.000Z");
    const start = estimateRunningRemainingSeconds(
      baseBuild({
        id: 1,
        status: "RUNNING",
        phase: "mux",
        progressPercent: 60,
        progressMessage: "Сборка MKV",
        progressOutTimeMs: muxStartedMs,
        updatedAt: "2026-01-01T10:00:00.000Z",
      }),
      muxStartedMs,
    );
    const half = estimateRunningRemainingSeconds(
      baseBuild({
        id: 1,
        status: "RUNNING",
        phase: "mux",
        progressPercent: 81,
        progressMessage: "Сборка MKV 70%",
        progressOutTimeMs: muxStartedMs,
        updatedAt: "2026-01-01T10:01:30.000Z",
      }),
      Date.parse("2026-01-01T10:01:30.000Z"),
    );
    expect(start).not.toBeNull();
    expect(half).not.toBeNull();
    expect(half!).toBeLessThan(start!);
    // 70% after 90s → ~38s mux left + finalize
    expect(half!).toBeGreaterThan(75);
    expect(half!).toBeLessThan(95);
  });

  it("counts down mux eta roughly 1:1 between worker updates", () => {
    const muxStartedMs = Date.parse("2026-01-01T10:00:00.000Z");
    const snapshot = baseBuild({
      id: 1,
      status: "RUNNING",
      phase: "mux",
      progressPercent: 72,
      progressMessage: "Сборка MKV 40%",
      progressOutTimeMs: muxStartedMs,
      updatedAt: "2026-01-01T10:01:00.000Z",
    });
    const atMinute = estimateRunningRemainingSeconds(
      snapshot,
      Date.parse("2026-01-01T10:01:00.000Z"),
    );
    const thirtySecLater = estimateRunningRemainingSeconds(
      snapshot,
      Date.parse("2026-01-01T10:01:30.000Z"),
    );

    expect(atMinute).not.toBeNull();
    expect(thirtySecLater).not.toBeNull();
    expect(atMinute! - thirtySecLater!).toBeGreaterThanOrEqual(25);
    expect(atMinute! - thirtySecLater!).toBeLessThanOrEqual(35);
  });

  it("does not stick at 50s while mux sub-progress advances", () => {
    const muxStartedMs = Date.parse("2026-01-01T10:00:00.000Z");
    const atHalf = estimateRunningRemainingSeconds(
      baseBuild({
        id: 1,
        status: "RUNNING",
        phase: "mux",
        progressPercent: 75,
        progressMessage: "Сборка MKV 50%",
        progressOutTimeMs: muxStartedMs,
        updatedAt: "2026-01-01T10:01:00.000Z",
      }),
      Date.parse("2026-01-01T10:01:00.000Z"),
    );
    const thirtySecLater = estimateRunningRemainingSeconds(
      baseBuild({
        id: 1,
        status: "RUNNING",
        phase: "mux",
        progressPercent: 75,
        progressMessage: "Сборка MKV 50%",
        progressOutTimeMs: muxStartedMs,
        updatedAt: "2026-01-01T10:01:00.000Z",
      }),
      Date.parse("2026-01-01T10:01:30.000Z"),
    );
    const atThreeQuarters = estimateRunningRemainingSeconds(
      baseBuild({
        id: 1,
        status: "RUNNING",
        phase: "mux",
        progressPercent: 82,
        progressMessage: "Сборка MKV 73%",
        progressOutTimeMs: muxStartedMs,
        updatedAt: "2026-01-01T10:01:30.000Z",
      }),
      Date.parse("2026-01-01T10:02:00.000Z"),
    );

    expect(atHalf).not.toBe(50);
    expect(thirtySecLater).not.toBeNull();
    expect(atHalf).not.toBeNull();
    expect(thirtySecLater!).toBeLessThan(atHalf!);
    expect(atThreeQuarters).not.toBeNull();
    expect(atThreeQuarters!).toBeLessThan(atHalf!);
  });
});

describe("estimateRecipeDurationSeconds", () => {
  it("grows with transcode track count", () => {
    const single = baseBuild({ id: 1, status: "QUEUED" });
    const dual = baseBuild({
      id: 2,
      status: "QUEUED",
      tracks: [
        ...(single.tracks ?? []),
        {
          ...(single.tracks?.[1] ?? {}),
          id: 3,
          sortOrder: 2,
          sourceStreamIndex: 2,
          sourceTrackLabel: "Eng 2",
          audioMode: "TRANSCODE" as const,
        },
      ],
    });

    expect(estimateRecipeDurationSeconds(dual)).toBeGreaterThan(
      estimateRecipeDurationSeconds(single),
    );
  });
});

describe("queue eta labels", () => {
  it("includes wait time before start", () => {
    const running = baseBuild({
      id: 10,
      status: "RUNNING",
      phase: "transcode",
      progressDurationMs: 7_200_000,
      progressOutTimeMs: 600_000,
      progressSpeed: 1,
      progressStepIndex: 0,
      progressStepTotal: 1,
      updatedAt: new Date().toISOString(),
    });
    const queued = baseBuild({ id: 11, status: "QUEUED", queueOrder: 1 });

    const wait = estimateQueuedWaitSeconds(queued, [running, queued]);
    expect(wait).toBeGreaterThan(1000);

    const label = buildQueuedEtaLabel(queued, [running, queued]);
    expect(label).toContain("до старта");
    expect(label).toContain("всего");
  });

  it("builds running label", () => {
    const label = buildRunningEtaLabel(
      baseBuild({
        id: 1,
        status: "RUNNING",
        phase: "mux",
        progressPercent: 70,
      }),
    );

    expect(label).toMatch(/^осталось /);
  });
});
