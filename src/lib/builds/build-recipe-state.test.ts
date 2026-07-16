import { describe, expect, it } from "vitest";
import {
  createInitialBuildState,
  moveTrack,
  serializeBuildRecipe,
} from "@/lib/builds/build-recipe-state";
import type { ReleaseWithTracks } from "@/lib/movies/movie-include";

function sampleRelease(): ReleaseWithTracks {
  return {
    id: 10,
    movieId: 1,
    externalStorageId: null,
    filePath: "/a.mkv",
    fileSize: 1,
    fileMtime: new Date(),
    fileHash: "x",
    releaseType: "bdremux",
    version: "theatrical",
    durationSeconds: 100,
    createdAt: new Date(),
    updatedAt: new Date(),
    externalStorage: null,
    videoTrack: {
      id: 1,
      releaseId: 10,
      streamIndex: 0,
      width: 1920,
      height: 1080,
      resolutionLabel: "1080p",
      codec: "hevc",
      hdr: "SDR",
      fps: "24",
      bitrate: 1000,
    },
    audioTracks: [
      {
        id: 2,
        releaseId: 10,
        streamIndex: 1,
        codec: "dts",
        profile: null,
        channels: 6,
        channelLayout: "5.1",
        bitrate: 1500,
        language: "rus",
        title: "RU",
        translationType: "dub",
        isDefault: true,
      },
    ],
    subtitleTracks: [],
  };
}

describe("build-recipe-state", () => {
  it("creates initial recipe from primary release", () => {
    const state = createInitialBuildState([sampleRelease()]);
    expect(state.tracks.some((t) => t.kind === "video")).toBe(true);
    expect(state.tracks.some((t) => t.kind === "audio")).toBe(true);
  });

  it("serializes recipe for API", () => {
    const state = createInitialBuildState([sampleRelease()]);
    const payload = serializeBuildRecipe({
      ...state,
      outputPath: "/out.mkv",
    });
    expect(payload.outputPath).toBe("/out.mkv");
    expect(payload.tracks[0]?.kind).toBe("video");
  });

  it("moves tracks", () => {
    const state = createInitialBuildState([sampleRelease()]);
    const moved = moveTrack(state.tracks, 0, 1);
    expect(moved[1]?.kind).toBe("video");
  });
});
