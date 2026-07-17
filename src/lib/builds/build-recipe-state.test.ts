import { describe, expect, it } from "vitest";
import {
  applyTrackPatch,
  createInitialBuildState,
  moveTrack,
  normalizeExclusiveDefaults,
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

  it("keeps at most one default audio and subtitle", () => {
    const release = sampleRelease();
    release.audioTracks.push({
      ...release.audioTracks[0]!,
      id: 3,
      streamIndex: 2,
      title: "EN",
      isDefault: true,
    });
    release.subtitleTracks = [
      {
        id: 4,
        releaseId: 10,
        streamIndex: 3,
        codec: "ass",
        codecLabel: "ASS",
        language: "rus",
        title: "RU forced",
        forced: true,
        isDefault: true,
      },
      {
        id: 5,
        releaseId: 10,
        streamIndex: 4,
        codec: "ass",
        codecLabel: "ASS",
        language: "rus",
        title: "RU full",
        forced: false,
        isDefault: true,
      },
    ];
    const state = createInitialBuildState([release]);
    const audioDefaults = state.tracks.filter((t) => t.kind === "audio" && t.isDefault);
    const subDefaults = state.tracks.filter((t) => t.kind === "subtitle" && t.isDefault);
    expect(audioDefaults).toHaveLength(1);
    expect(subDefaults).toHaveLength(1);
  });

  it("applyTrackPatch clears other defaults of the same kind", () => {
    const tracks = normalizeExclusiveDefaults([
      {
        key: "a1",
        kind: "audio",
        sourceReleaseId: 1,
        sourceStreamIndex: 1,
        label: "A1",
        isDefault: true,
      },
      {
        key: "a2",
        kind: "audio",
        sourceReleaseId: 1,
        sourceStreamIndex: 2,
        label: "A2",
        isDefault: false,
      },
      {
        key: "s1",
        kind: "subtitle",
        sourceReleaseId: 1,
        sourceStreamIndex: 3,
        label: "S1",
        isDefault: true,
      },
      {
        key: "s2",
        kind: "subtitle",
        sourceReleaseId: 1,
        sourceStreamIndex: 4,
        label: "S2",
        isDefault: false,
      },
    ]);

    const next = applyTrackPatch(tracks, 1, { isDefault: true });
    expect(next[0]?.isDefault).toBe(false);
    expect(next[1]?.isDefault).toBe(true);
    expect(next[2]?.isDefault).toBe(true);
    expect(next[3]?.isDefault).toBe(false);

    const subs = applyTrackPatch(next, 3, { isDefault: true });
    expect(subs[2]?.isDefault).toBe(false);
    expect(subs[3]?.isDefault).toBe(true);
  });
});
