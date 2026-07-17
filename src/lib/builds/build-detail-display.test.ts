import { describe, expect, it } from "vitest";
import {
  buildPhaseLabel,
  buildSourceRoleLabel,
  buildTrackDetailTags,
  buildTrackTitle,
  buildTimelineEntries,
  groupBuildTracksByKind,
  normalizeBuildTrackKind,
} from "@/lib/builds/build-detail-display";
import type { SerializedBuild } from "@/lib/builds/build-serialize";

function track(
  partial: Partial<SerializedBuild["tracks"][number]> &
    Pick<SerializedBuild["tracks"][number], "id" | "kind" | "sourceStreamIndex">,
): SerializedBuild["tracks"][number] {
  return {
    sortOrder: 0,
    sourceReleaseId: 1,
    sourceFilePath: "/movies/a.mkv",
    sourceTrackLabel: null,
    audioMode: null,
    transcodeCodec: null,
    transcodeBitrate: null,
    channelTarget: null,
    offsetMs: 0,
    isDefault: false,
    forced: false,
    keepOriginal: false,
    ...partial,
  };
}

describe("build-detail-display", () => {
  it("maps known phases to Russian labels", () => {
    expect(buildPhaseLabel("mux")).toBe("Сборка MKV");
    expect(buildPhaseLabel("unknown-step")).toBe("unknown-step");
    expect(buildPhaseLabel(null)).toBeNull();
  });

  it("normalizes Prisma track kinds", () => {
    expect(normalizeBuildTrackKind("VIDEO")).toBe("video");
    expect(normalizeBuildTrackKind("AUDIO")).toBe("audio");
  });

  it("labels source roles", () => {
    expect(buildSourceRoleLabel("video")).toBe("Видео-источник");
    expect(buildSourceRoleLabel("tracks")).toBe("Дорожки и субтитры");
  });

  it("builds transcode tag set for audio tracks", () => {
    const tags = buildTrackDetailTags(
      track({
        id: 1,
        kind: "AUDIO",
        sourceStreamIndex: 2,
        audioMode: "TRANSCODE",
        transcodeCodec: "eac3",
        transcodeBitrate: 768,
        channelTarget: "UP_TO_51",
        keepOriginal: true,
      }),
    );
    expect(tags.some((t) => t.label === "EAC3")).toBe(true);
    expect(tags.some((t) => t.label === "5.1")).toBe(true);
    expect(tags.some((t) => t.label === "+ оригинал")).toBe(true);
  });

  it("prefers stored track label in title", () => {
    expect(
      buildTrackTitle(
        track({
          id: 1,
          kind: "AUDIO",
          sourceStreamIndex: 0,
          sourceTrackLabel: "Русский DTS-HD MA 7.1",
        }),
      ),
    ).toBe("Русский DTS-HD MA 7.1");
  });

  it("groups tracks by kind in video-audio-subtitle order", () => {
    const groups = groupBuildTracksByKind([
      track({ id: 2, kind: "AUDIO", sourceStreamIndex: 1, sortOrder: 1 }),
      track({ id: 1, kind: "VIDEO", sourceStreamIndex: 0, sortOrder: 0 }),
      track({ id: 3, kind: "SUBTITLE", sourceStreamIndex: 3, sortOrder: 2 }),
    ]);
    expect(groups.map((g) => g.kind)).toEqual(["video", "audio", "subtitle"]);
  });

  it("includes cancel flag in timeline", () => {
    const entries = buildTimelineEntries({
      id: 1,
      movieId: 1,
      movie: {
        id: 1,
        slug: "x",
        title: "X",
        coverPath: null,
        updatedAt: new Date(),
      },
      status: "RUNNING",
      phase: "mux",
      progressPercent: 40,
      progressMessage: null,
      errorMessage: null,
      cancelRequested: true,
      outputPath: "/out.mkv",
      outputReleaseType: null,
      outputVersion: "theatrical",
      outputReleaseId: null,
      outputRelease: null,
      externalStorage: null,
      warnings: [],
      visualTier: null,
      spotlightTier: "general",
      sources: [],
      tracks: [],
      startedAt: "2026-01-01T10:00:00.000Z",
      finishedAt: null,
      queueOrder: 0,
      createdAt: "2026-01-01T09:00:00.000Z",
      updatedAt: "2026-01-01T10:00:00.000Z",
    });
    expect(entries.some((e) => e.key === "cancel")).toBe(true);
  });
});
