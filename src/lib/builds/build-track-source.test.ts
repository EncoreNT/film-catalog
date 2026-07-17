import { describe, expect, it, vi } from "vitest";
import type { ReleaseWithTracks } from "@/lib/movies/movie-include";
import {
  buildRecipeTrackFromCatalogPick,
  normalizeBuildTrackKind,
  resolveCatalogAudioTrack,
  resolveCatalogSubtitleTrack,
  resolveCatalogVideoTrack,
} from "@/lib/builds/build-track-source";

function mkRelease(
  audioStreamIndices: number[],
  subtitleStreamIndices: number[] = [5, 6],
): ReleaseWithTracks {
  return {
    id: 10,
    movieId: 1,
    filePath: "/in.mkv",
    releaseType: "bdremux",
    version: "theatrical",
    durationSeconds: 7200,
    fileSize: 50_000_000_000,
    externalStorageId: null,
    videoTrack: {
      id: 1,
      releaseId: 10,
      streamIndex: 0,
      codec: "hevc",
      profile: null,
      width: 3840,
      height: 2160,
      resolutionLabel: "4K",
      hdr: "DV:P8",
      fps: "23.976",
      bitrate: 41_400,
    },
    audioTracks: audioStreamIndices.map((streamIndex, index) => ({
      id: index + 1,
      releaseId: 10,
      streamIndex,
      codec: index === 0 ? "dts" : index === 1 ? "truehd" : index === 2 ? "ac3" : "dts-hd ma",
      profile: index === 1 ? "Atmos" : null,
      channelLayout: index === 1 ? "7.1" : "5.1",
      language: index === 1 ? "eng" : "rus",
      translationType: index === 1 ? "original" : "dub",
      bitrate: index === 0 ? 768 : index === 1 ? 5000 : index === 2 ? 640 : 4900,
      title:
        index === 0
          ? "Dub, Blu-Ray"
          : index === 1
            ? "Original"
            : index === 2
              ? "AVO"
              : "Dub, Custom",
      isDefault: index === 0,
    })),
    subtitleTracks: subtitleStreamIndices.map((streamIndex, index) => ({
      id: index + 100,
      releaseId: 10,
      streamIndex,
      codec: "subrip",
      codecLabel: "SRT",
      language: "rus",
      title: index === 0 ? "Forced" : "Blu-Ray",
      forced: index === 0,
      isDefault: false,
    })),
  } as unknown as ReleaseWithTracks;
}

describe("normalizeBuildTrackKind", () => {
  it("normalizes prisma enum values", () => {
    expect(normalizeBuildTrackKind("VIDEO")).toBe("video");
    expect(normalizeBuildTrackKind("AUDIO")).toBe("audio");
    expect(normalizeBuildTrackKind("SUBTITLE")).toBe("subtitle");
  });
});

describe("resolveCatalogTrack", () => {
  const release = mkRelease([1, 2, 3, 4]);

  it("finds catalog rows by stored streamIndex identity", () => {
    expect(resolveCatalogAudioTrack(release, 2)?.title).toBe("Original");
    expect(resolveCatalogAudioTrack(release, 4)?.title).toBe("Dub, Custom");
    expect(resolveCatalogSubtitleTrack(release, 6)?.title).toBe("Blu-Ray");
  });

  it("requires matching video streamIndex", () => {
    expect(resolveCatalogVideoTrack(release, 0)?.codec).toBe("hevc");
    expect(resolveCatalogVideoTrack(release, 1)).toBeNull();
  });
});

describe("buildRecipeTrackFromCatalogPick", () => {
  it("creates recipe tracks from deck picks", () => {
    vi.stubGlobal("crypto", { randomUUID: () => "uuid-test" });
    const release = mkRelease([1, 2, 3, 4]);

    const audio = buildRecipeTrackFromCatalogPick(release, "audio", 2);
    expect(audio).toMatchObject({
      kind: "audio",
      sourceReleaseId: 10,
      sourceStreamIndex: 2,
      label: "Original",
      audioMode: "copy",
    });

    const missing = buildRecipeTrackFromCatalogPick(release, "audio", 99);
    expect(missing).toBeNull();
    vi.unstubAllGlobals();
  });
});
