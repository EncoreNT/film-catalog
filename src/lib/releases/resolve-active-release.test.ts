import { describe, expect, it } from "vitest";
import { resolveActiveRelease } from "@/lib/releases/resolve-active-release";
import type { ReleaseWithTracks } from "@/lib/movies/movie-include";

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
    releaseType: partial.releaseType ?? "bdrip",
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

describe("resolveActiveRelease", () => {
  it("returns null for empty list", () => {
    expect(resolveActiveRelease([], null)).toBeNull();
  });

  it("returns matched release when releaseIdParam is valid", () => {
    const hd = release({ id: 1, releaseType: "bdrip" });
    const fourK = release({
      id: 2,
      releaseType: "bdremux",
      videoTrack: {
        id: 10,
        releaseId: 2,
        streamIndex: 0,
        width: 3840,
        height: 2160,
        resolutionLabel: "4K",
        codec: "hevc",
        hdr: "HDR10",
        fps: "24",
        bitrate: null,
      },
    });
    expect(resolveActiveRelease([hd, fourK], 1)).toBe(hd);
  });

  it("falls back to primary release when param is missing or unknown", () => {
    const hd = release({ id: 1, releaseType: "bdrip" });
    const fourK = release({
      id: 2,
      releaseType: "bdremux",
      videoTrack: {
        id: 10,
        releaseId: 2,
        streamIndex: 0,
        width: 3840,
        height: 2160,
        resolutionLabel: "4K",
        codec: "hevc",
        hdr: "HDR10",
        fps: "24",
        bitrate: null,
      },
    });
    expect(resolveActiveRelease([hd, fourK], null)?.id).toBe(2);
    expect(resolveActiveRelease([hd, fourK], 999)?.id).toBe(2);
  });
});
