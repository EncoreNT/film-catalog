import { describe, expect, it } from "vitest";
import { pickPrimaryRelease, rankRelease } from "./release-primary";
import type { ReleaseWithTracks } from "./release-primary";

function release(
  partial: Partial<ReleaseWithTracks> & { id: number },
): ReleaseWithTracks {
  return {
    id: partial.id,
    movieId: 1,
    externalStorageId: null,
    filePath: null,
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

describe("pickPrimaryRelease", () => {
  it("prefers 4K over 1080p", () => {
    const fourK = release({
      id: 1,
      releaseType: "bdremux",
      videoTrack: {
        id: 1,
        releaseId: 1,
        streamIndex: 0,
        width: 3840,
        height: 2160,
        resolutionLabel: "4K",
        codec: "hevc",
        hdr: "HDR10",
        fps: "24",
        bitrate: 50000000,
      },
    });
    const hd = release({
      id: 2,
      releaseType: "bdrip",
      videoTrack: {
        id: 2,
        releaseId: 2,
        streamIndex: 0,
        width: 1920,
        height: 1080,
        resolutionLabel: "1080p",
        codec: "h264",
        hdr: "SDR",
        fps: "24",
        bitrate: 8000000,
      },
    });
    expect(pickPrimaryRelease([hd, fourK])?.id).toBe(1);
  });

  it("prefers bdremux over bdrip at same resolution", () => {
    const remux = release({
      id: 1,
      releaseType: "bdremux",
      videoTrack: {
        id: 1,
        releaseId: 1,
        streamIndex: 0,
        width: 1920,
        height: 1080,
        resolutionLabel: "1080p",
        codec: "h264",
        hdr: null,
        fps: null,
        bitrate: null,
      },
    });
    const rip = release({
      id: 2,
      releaseType: "bdrip",
      videoTrack: {
        id: 2,
        releaseId: 2,
        streamIndex: 0,
        width: 1920,
        height: 1080,
        resolutionLabel: "1080p",
        codec: "h264",
        hdr: null,
        fps: null,
        bitrate: null,
      },
    });
    expect(rankRelease(remux)).toBeGreaterThan(rankRelease(rip));
    expect(pickPrimaryRelease([rip, remux])?.id).toBe(1);
  });

  it("returns null for empty list", () => {
    expect(pickPrimaryRelease([])).toBeNull();
  });
});
