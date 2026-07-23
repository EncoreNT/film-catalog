import { describe, expect, it } from "vitest";
import type { ReleaseWithTracks } from "@/lib/movies/movie-include";
import {
  buildSpotlightFromVisual,
  resolveBuildQueueSpotlightTier,
  resolveBuildVisualTier,
} from "@/lib/builds/build-visual-tier";

function release(
  partial: Partial<ReleaseWithTracks> & { id: number },
): ReleaseWithTracks {
  return {
    id: partial.id,
    movieId: 1,
    externalStorageId: null,
    filePath: "/films/test.mkv",
    fileSize: null,
    fileMtime: null,
    fileHash: null,
    releaseType: partial.releaseType ?? null,
    version: "theatrical",
    durationSeconds: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    externalStorage: null,
    videoTrack: partial.videoTrack ?? null,
    audioTracks: partial.audioTracks ?? [],
    subtitleTracks: partial.subtitleTracks ?? [],
  };
}

function video(hdr: string | null) {
  return {
    id: 1,
    releaseId: 1,
    streamIndex: 0,
    width: 3840,
    height: 2160,
    resolutionLabel: "4K",
    codec: "hevc",
    hdr,
    fps: "24",
    bitrate: 50000000,
  };
}

function audio(
  overrides: Partial<{
    streamIndex: number;
    language: string | null;
    isDefault: boolean;
    codec: string | null;
    profile: string | null;
    channels: number | null;
    channelLayout: string | null;
    translationType: string | null;
  }> = {},
) {
  return {
    id: 1,
    releaseId: 1,
    streamIndex: 0,
    language: "rus",
    isDefault: true,
    codec: "truehd",
    profile: "Atmos",
    channels: 8,
    channelLayout: "7.1",
    translationType: "dub",
    title: null,
    bitrate: 4000,
    ...overrides,
  };
}

describe("resolveBuildVisualTier", () => {
  it("uses output release tier when build finished", () => {
    const output = release({
      id: 99,
      videoTrack: video("HDR10"),
      audioTracks: [audio()],
    });

    expect(
      resolveBuildVisualTier({
        sources: [],
        tracks: [],
        outputRelease: output,
      }),
    ).toBe("ruby");
  });

  it("returns ruby for planned 4K HDR mux with rus Atmos dub track", () => {
    const videoRelease = release({
      id: 1,
      videoTrack: video("HDR10"),
      audioTracks: [audio({ streamIndex: 1 })],
    });

    expect(
      resolveBuildVisualTier({
        sources: [{ role: "video", releaseId: 1, release: videoRelease }],
        tracks: [
          { kind: "VIDEO", sourceReleaseId: 1, sourceStreamIndex: 0 },
          { kind: "AUDIO", sourceReleaseId: 1, sourceStreamIndex: 1 },
        ],
        outputRelease: null,
      }),
    ).toBe("ruby");
  });

  it("returns ruby for planned 4K HDR mux with rus DTS:X dub track", () => {
    const videoRelease = release({
      id: 1,
      videoTrack: video("HDR10"),
      audioTracks: [
        audio({
          codec: "dts-hd",
          profile: "DTS:X MA",
          channels: 8,
          channelLayout: "7.1",
          streamIndex: 1,
        }),
      ],
    });

    expect(
      resolveBuildVisualTier({
        sources: [{ role: "video", releaseId: 1, release: videoRelease }],
        tracks: [
          { kind: "VIDEO", sourceReleaseId: 1, sourceStreamIndex: 0 },
          { kind: "AUDIO", sourceReleaseId: 1, sourceStreamIndex: 1 },
        ],
        outputRelease: null,
      }),
    ).toBe("ruby");
  });

  it("returns gold for 4K HDR with 5.1 audio in mux", () => {
    const videoRelease = release({
      id: 1,
      videoTrack: video("HDR10"),
      audioTracks: [
        audio({
          codec: "ac3",
          profile: null,
          channels: 6,
          channelLayout: "5.1",
          streamIndex: 1,
        }),
      ],
    });

    expect(
      resolveBuildVisualTier({
        sources: [{ role: "video", releaseId: 1, release: videoRelease }],
        tracks: [
          { kind: "VIDEO", sourceReleaseId: 1, sourceStreamIndex: 0 },
          { kind: "AUDIO", sourceReleaseId: 1, sourceStreamIndex: 1 },
        ],
        outputRelease: null,
      }),
    ).toBe("gold");
  });

  it("returns standard for 1080p sources", () => {
    const hdRelease = release({
      id: 2,
      videoTrack: {
        ...video("SDR"),
        width: 1920,
        height: 1080,
        resolutionLabel: "1080p",
      },
    });

    expect(
      resolveBuildVisualTier({
        sources: [{ role: "video", releaseId: 2, release: hdRelease }],
        tracks: [{ kind: "VIDEO", sourceReleaseId: 2, sourceStreamIndex: 0 }],
        outputRelease: null,
      }),
    ).toBe("standard");
  });

  it("returns null when video source is missing", () => {
    expect(
      resolveBuildVisualTier({
        sources: [],
        tracks: [],
        outputRelease: null,
      }),
    ).toBeNull();
  });
});

describe("buildSpotlightFromVisual", () => {
  it("maps visual tiers to spotlight tokens", () => {
    expect(buildSpotlightFromVisual("ruby")).toBe("ruby");
    expect(buildSpotlightFromVisual("gold")).toBe("gold");
    expect(buildSpotlightFromVisual("standard")).toBe("standard");
    expect(buildSpotlightFromVisual(null)).toBe("general");
  });
});

describe("resolveBuildQueueSpotlightTier", () => {
  it("prefers active jobs and picks best tier", () => {
    expect(
      resolveBuildQueueSpotlightTier([
        { visualTier: "standard", status: "SUCCEEDED" },
        { visualTier: "gold", status: "RUNNING" },
        { visualTier: "ruby", status: "QUEUED" },
      ]),
    ).toBe("ruby");
  });

  it("falls back to archive when nothing active", () => {
    expect(
      resolveBuildQueueSpotlightTier([
        { visualTier: "standard", status: "SUCCEEDED" },
        { visualTier: "gold", status: "FAILED" },
      ]),
    ).toBe("gold");
  });
});
