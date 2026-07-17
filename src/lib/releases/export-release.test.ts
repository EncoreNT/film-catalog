import { describe, expect, it } from "vitest";
import { suggestExportFilename } from "@/lib/releases/export-release";
import type { ReleaseWithTracks } from "@/lib/movies/movie-include";

function release(partial: Partial<ReleaseWithTracks>): ReleaseWithTracks {
  return {
    id: 1,
    movieId: 1,
    externalStorageId: null,
    filePath: partial.filePath ?? "/mnt/d/Movies/sample.mkv",
    fileSize: null,
    fileMtime: null,
    fileHash: null,
    releaseType: null,
    version: "theatrical",
    durationSeconds: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    externalStorage: null,
    videoTrack: null,
    audioTracks: [],
    subtitleTracks: [],
    ...partial,
  };
}

describe("suggestExportFilename", () => {
  it("uses basename from release path", () => {
    expect(
      suggestExportFilename(release({}), { title: "Ignored", year: 2001 }),
    ).toBe("sample.mkv");
  });

  it("falls back to movie title when path missing", () => {
    expect(
      suggestExportFilename(release({ filePath: null }), {
        title: "Matrix",
        year: 1999,
      }),
    ).toBe("Matrix (1999).mkv");
  });
});
