import { describe, expect, it } from "vitest";
import type { ReleaseWithTracks } from "@/lib/movies/movie-include";
import {
  estimateBuildOutputSize,
  estimateBuildOutputSizeFromRecipe,
  formatBuildOutputSizeLabel,
  kbpsDurationToBytes,
} from "@/lib/builds/build-output-size";
import { createInitialBuildState } from "@/lib/builds/build-recipe-state";

function sampleRelease(overrides?: Partial<ReleaseWithTracks>): ReleaseWithTracks {
  return {
    id: 10,
    movieId: 1,
    externalStorageId: null,
    filePath: "/a.mkv",
    fileSize: 50_000_000_000,
    fileMtime: new Date(),
    fileHash: "x",
    releaseType: "bdremux",
    version: "theatrical",
    durationSeconds: 7200,
    createdAt: new Date(),
    updatedAt: new Date(),
    externalStorage: null,
    videoTrack: {
      id: 1,
      releaseId: 10,
      streamIndex: 0,
      width: 3840,
      height: 2160,
      resolutionLabel: "4K",
      codec: "hevc",
      hdr: "HDR10",
      fps: "24",
      bitrate: 50_000,
    },
    audioTracks: [
      {
        id: 2,
        releaseId: 10,
        streamIndex: 1,
        codec: "truehd",
        profile: "Atmos",
        channels: 8,
        channelLayout: "7.1",
        bitrate: 4000,
        language: "rus",
        title: "RU Atmos",
        translationType: "dub",
        isDefault: true,
      },
    ],
    subtitleTracks: [{ id: 3, releaseId: 10, streamIndex: 2, codec: "subrip", codecLabel: "SRT", language: "rus", title: null, isDefault: false, forced: true }],
    ...overrides,
  };
}

describe("kbpsDurationToBytes", () => {
  it("converts kbps over duration to bytes", () => {
    expect(kbpsDurationToBytes(1000, 100)).toBe(12_500_000);
  });
});

describe("estimateBuildOutputSize", () => {
  it("sums video, audio and subtitle with mux overhead", () => {
    const release = sampleRelease();
    const estimate = estimateBuildOutputSize(
      [
        { kind: "video", sourceReleaseId: 10, sourceStreamIndex: 0 },
        { kind: "audio", sourceReleaseId: 10, sourceStreamIndex: 1, audioMode: "copy" },
        { kind: "subtitle", sourceReleaseId: 10, sourceStreamIndex: 2 },
      ],
      [release],
    );

    expect(estimate).not.toBeNull();
    const video = kbpsDurationToBytes(50_000, 7200);
    const audio = kbpsDurationToBytes(4000, 7200);
    const raw = video + audio + 80_000;
    expect(estimate!.breakdown.videoBytes).toBe(video);
    expect(estimate!.breakdown.audioBytes).toBe(audio);
    expect(estimate!.totalBytes).toBe(Math.round(raw * 1.03));
    expect(estimate!.confidence).toBe("high");
  });

  it("uses transcode bitrate and keeps original when requested", () => {
    const release = sampleRelease();
    const estimate = estimateBuildOutputSize(
      [
        { kind: "video", sourceReleaseId: 10, sourceStreamIndex: 0 },
        {
          kind: "audio",
          sourceReleaseId: 10,
          sourceStreamIndex: 1,
          audioMode: "transcode",
          transcodeBitrate: 768,
          keepOriginal: true,
        },
      ],
      [release],
    );

    const expectedAudio =
      kbpsDurationToBytes(768, 7200) + kbpsDurationToBytes(4000, 7200);
    expect(estimate!.breakdown.audioBytes).toBe(expectedAudio);
  });

  it("returns actual size when output file is known", () => {
    const estimate = estimateBuildOutputSize([], [], {
      actualFileSizeBytes: 42_000_000_000,
    });
    expect(estimate).toMatchObject({
      totalBytes: 42_000_000_000,
      actual: true,
      confidence: "high",
    });
  });

  it("works from initial recipe state", () => {
    const release = sampleRelease();
    const state = createInitialBuildState([release]);
    const estimate = estimateBuildOutputSizeFromRecipe(state.tracks, [release]);
    expect(estimate?.totalBytes).toBeGreaterThan(0);
  });
});

describe("formatBuildOutputSizeLabel", () => {
  it("prefixes approximate estimates", () => {
    expect(
      formatBuildOutputSizeLabel({
        totalBytes: 42_000_000_000,
        confidence: "high",
        breakdown: {
          videoBytes: 0,
          audioBytes: 0,
          subtitleBytes: 0,
          overheadBytes: 0,
        },
      }),
    ).toBe("≈ 39.1 ГБ");
  });
});
