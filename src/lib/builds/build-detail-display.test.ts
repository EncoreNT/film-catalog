import { describe, expect, it } from "vitest";
import {
  buildAudioTechLine,
  buildCompositionHeadline,
  buildPhaseLabel,
  buildSourceReleaseMap,
  buildSourceRoleLabel,
  buildTrackActionSummary,
  buildTrackDetailLine,
  buildTrackDetailTags,
  buildTrackFlags,
  buildTrackTitle,
  buildTimelineEntries,
  buildVideoTechLine,
  groupBuildTracksByKind,
  normalizeBuildTrackKind,
  resolveBuildSourceTrack,
} from "@/lib/builds/build-detail-display";
import type { SerializedBuild } from "@/lib/builds/build-serialize";
import type { BuildSourceRelease } from "@/lib/builds/build-detail-display";

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

  it("builds transcode action summary for audio tracks", () => {
    expect(
      buildTrackActionSummary(
        track({
          id: 1,
          kind: "AUDIO",
          sourceStreamIndex: 2,
          audioMode: "TRANSCODE",
          transcodeCodec: "ac3",
          transcodeBitrate: 640,
          channelTarget: "UP_TO_51",
        }),
      ),
    ).toEqual({
      label: "→ AC3 · 640 · 5.1",
      tone: "neural",
    });
  });

  it("collects composition flags", () => {
    expect(
      buildTrackFlags(
        track({
          id: 1,
          kind: "AUDIO",
          sourceStreamIndex: 0,
          isDefault: true,
          keepOriginal: true,
          audioMode: "TRANSCODE",
        }),
      ),
    ).toEqual(["главная", "+ оригинал"]);
  });

  it("builds composition headline from track groups", () => {
    expect(
      buildCompositionHeadline([
        track({ id: 1, kind: "VIDEO", sourceStreamIndex: 0, sortOrder: 0 }),
        track({ id: 2, kind: "AUDIO", sourceStreamIndex: 1, sortOrder: 1 }),
        track({ id: 3, kind: "AUDIO", sourceStreamIndex: 2, sortOrder: 2 }),
        track({ id: 4, kind: "SUBTITLE", sourceStreamIndex: 3, sortOrder: 3 }),
      ]),
    ).toBe("1 видео · 2 аудио · 1 субтитр");
  });

  it("formats video and audio tech lines for composition detail", () => {
    expect(
      buildVideoTechLine({
        id: 1,
        releaseId: 1,
        streamIndex: 0,
        width: 3840,
        height: 2160,
        resolutionLabel: "4K",
        codec: "hevc",
        hdr: "HDR10+",
        fps: "23.976",
        bitrate: 65000,
      }),
    ).toBe("HEVC · 4K UHD · HDR10+ · 23.976 fps · 65.0Mbps");

    expect(
      buildAudioTechLine({
        id: 2,
        releaseId: 1,
        streamIndex: 1,
        codec: "dts",
        profile: "HD MA",
        channels: 8,
        channelLayout: "7.1",
        bitrate: 3072,
        language: "rus",
        title: null,
        translationType: "dub",
        isDefault: true,
      }),
    ).toContain("3.1Mbps");
  });

  it("merges source tech and build flags in detail line", () => {
    const release: BuildSourceRelease = {
      id: 10,
      videoTrack: {
        id: 1,
        releaseId: 10,
        streamIndex: 0,
        width: 1920,
        height: 1080,
        resolutionLabel: "1080p",
        codec: "avc",
        hdr: "SDR",
        fps: "24",
        bitrate: 25000,
      },
      audioTracks: [
        {
          id: 2,
          releaseId: 10,
          streamIndex: 1,
          codec: "ac3",
          profile: null,
          channels: 6,
          channelLayout: "5.1",
          bitrate: 640,
          language: "rus",
          title: null,
          translationType: "dub",
          isDefault: true,
        },
      ],
      subtitleTracks: [],
    };

    const releases = buildSourceReleaseMap([
      {
        id: 1,
        releaseId: 10,
        filePath: "/a.mkv",
        durationSeconds: 7200,
        role: "video",
        release: release as NonNullable<SerializedBuild["sources"][number]["release"]>,
      },
    ]);

    const audioTrack = track({
      id: 3,
      kind: "AUDIO",
      sourceStreamIndex: 1,
      sourceReleaseId: 10,
      isDefault: true,
    });

    expect(buildTrackDetailLine(audioTrack, resolveBuildSourceTrack(releases, audioTrack))).toContain(
      "640kbps",
    );
    expect(buildTrackDetailLine(audioTrack, resolveBuildSourceTrack(releases, audioTrack))).toContain(
      "главная",
    );
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
      progressSpeed: null,
      progressOutTimeMs: null,
      progressDurationMs: null,
      progressStepIndex: null,
      progressStepTotal: null,
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
      requiresTranscode: false,
      createdAt: "2026-01-01T09:00:00.000Z",
      updatedAt: "2026-01-01T10:00:00.000Z",
    });
    expect(entries.some((e) => e.key === "cancel")).toBe(true);
  });
});
