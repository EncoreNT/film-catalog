import { describe, expect, it } from "vitest";
import { releaseTabLabel } from "@/lib/media/spec-tags";
import type { ReleaseWithTracks } from "@/lib/movies/movie-query";

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
    audioTracks: [],
    subtitleTracks: [],
  };
}

describe("releaseTabLabel", () => {
  it("combines release type and resolution", () => {
    expect(
      releaseTabLabel(
        release({
          id: 2,
          releaseType: "bdrip",
          videoTrack: {
            id: 1,
            releaseId: 2,
            streamIndex: 0,
            width: 1920,
            height: 1080,
            resolutionLabel: "1080p",
            codec: null,
            hdr: null,
            fps: null,
            bitrate: null,
          },
        }),
      ),
    ).toBe("BDRip · 1080p");
  });

  it("falls back when there are no distinguishing tags", () => {
    expect(releaseTabLabel(release({ id: 2 }))).toBe("релиз #2");
  });
});
