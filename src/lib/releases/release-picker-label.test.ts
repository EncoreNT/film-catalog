import { describe, expect, it } from "vitest";
import { releasePickerLabel } from "@/lib/releases/release-picker-label";
import type { ReleaseWithTracks } from "@/lib/movies/movie-include";

function stubRelease(overrides: Partial<ReleaseWithTracks>): ReleaseWithTracks {
  return {
    id: 1,
    movieId: 1,
    moviePartId: null,
    externalStorageId: null,
    filePath: null,
    fileSize: null,
    fileMtime: null,
    fileHash: null,
    releaseType: "dvdrip",
    version: "theatrical",
    durationSeconds: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    videoTrack: {
      id: 1,
      releaseId: 1,
      codec: "mpeg4",
      hdr: null,
      resolutionLabel: "480p",
      width: 640,
      height: 480,
      fps: "25",
      bitrate: null,
    },
    audioTracks: [],
    subtitleTracks: [],
    externalStorage: null,
    ...overrides,
  } as ReleaseWithTracks;
}

describe("releasePickerLabel", () => {
  it("appends basename when filePath is set", () => {
    const label = releasePickerLabel(
      stubRelease({
        filePath: "/mnt/d/Movies/Jekipazh part1.mkv",
      }),
    );
    expect(label).toContain("DVDRip");
    expect(label).toContain("480p");
    expect(label).toContain("Jekipazh part1.mkv");
  });

  it("falls back to spec only without path", () => {
    expect(releasePickerLabel(stubRelease({ filePath: null }))).toContain(
      "480p",
    );
  });
});
