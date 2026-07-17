import { describe, expect, it } from "vitest";
import {
  appendRecipeTokensToStem,
  buildRecipeFilenameTokens,
  suggestBuildOutputFilename,
  suggestBuildOutputFilenameFromMetadata,
  suggestBuildOutputPath,
} from "@/lib/builds/build-filename";
import type { BuildRecipeTrackState } from "@/lib/builds/build-recipe-state";

const releases = [
  {
    id: 1,
    filePath: "/mnt/d/Movies/Ford_v_Ferrari.Remux.UHD.4K.Atmos.RusATMOS.mkv",
    audioTracks: [
      { streamIndex: 0, language: "rus" },
      { streamIndex: 1, language: "eng" },
    ],
  },
  {
    id: 2,
    filePath: "/mnt/d/Movies/eng-atmos.mkv",
    audioTracks: [{ streamIndex: 0, language: "eng" }],
  },
];

const videoTrack: BuildRecipeTrackState = {
  key: "v",
  kind: "video",
  sourceReleaseId: 1,
  sourceStreamIndex: 0,
  label: "Видео",
};

describe("buildRecipeFilenameTokens", () => {
  it("returns empty for straight remux of one release", () => {
    expect(
      buildRecipeFilenameTokens(
        [
          videoTrack,
          {
            key: "a",
            kind: "audio",
            sourceReleaseId: 1,
            sourceStreamIndex: 0,
            label: "Rus",
            audioMode: "copy",
          },
        ],
        [...releases],
      ),
    ).toEqual([]);
  });

  it("adds eac3 and 51 for transcode", () => {
    expect(
      buildRecipeFilenameTokens(
        [
          videoTrack,
          {
            key: "a",
            kind: "audio",
            sourceReleaseId: 1,
            sourceStreamIndex: 1,
            label: "Eng",
            audioMode: "transcode",
            transcodeCodec: "eac3",
            channelTarget: "up_to_51",
          },
        ],
        [...releases],
      ),
    ).toEqual(["eac3", "51"]);
  });

  it("adds mux and language for external audio", () => {
    expect(
      buildRecipeFilenameTokens(
        [
          videoTrack,
          {
            key: "a",
            kind: "audio",
            sourceReleaseId: 2,
            sourceStreamIndex: 0,
            label: "Eng",
            audioMode: "copy",
          },
        ],
        [...releases],
      ),
    ).toEqual(["mux", "eng"]);
  });

  it("adds dual when keepOriginal on transcode", () => {
    expect(
      buildRecipeFilenameTokens(
        [
          videoTrack,
          {
            key: "a",
            kind: "audio",
            sourceReleaseId: 1,
            sourceStreamIndex: 1,
            label: "Eng",
            audioMode: "transcode",
            transcodeCodec: "eac3",
            channelTarget: "up_to_51",
            keepOriginal: true,
          },
        ],
        [...releases],
      ),
    ).toEqual(["eac3", "51", "dual"]);
  });
});

describe("appendRecipeTokensToStem", () => {
  it("skips tokens already present in stem", () => {
    expect(
      appendRecipeTokensToStem("Movie.eac3.51", ["eac3", "51"]),
    ).toBe("Movie.eac3.51");
  });
});

describe("suggestBuildOutputFilename", () => {
  it("derives from video source basename with recipe suffix", () => {
    const name = suggestBuildOutputFilename({
      tracks: [
        videoTrack,
        {
          key: "a",
          kind: "audio",
          sourceReleaseId: 1,
          sourceStreamIndex: 1,
          label: "Eng",
          audioMode: "transcode",
          transcodeCodec: "eac3",
          channelTarget: "up_to_51",
        },
      ],
      releases: [...releases],
      movieTitle: "Ignored",
      movieYear: null,
      releaseType: "",
      version: "theatrical",
    });
    expect(name).toBe(
      "Ford_v_Ferrari.Remux.UHD.4K.Atmos.RusATMOS.eac3.51.mkv",
    );
  });

  it("falls back to metadata when source path missing", () => {
    expect(
      suggestBuildOutputFilename({
        tracks: [videoTrack],
        releases: [{ id: 1, filePath: null, audioTracks: [] }],
        movieTitle: "Inception",
        movieYear: 2010,
        releaseType: "bluray",
        version: "theatrical",
        resolutionLabel: "4K",
        hdr: "HDR10",
      }),
    ).toContain("Inception (2010)");
  });
});

describe("suggestBuildOutputFilenameFromMetadata", () => {
  it("builds filename from movie metadata", () => {
    expect(
      suggestBuildOutputFilenameFromMetadata({
        movieTitle: "Inception",
        movieYear: 2010,
        releaseType: "bluray",
        version: "theatrical",
        resolutionLabel: "4K",
        hdr: "HDR10",
      }),
    ).toMatch(/\.mkv$/);
  });
});

describe("suggestBuildOutputPath", () => {
  it("places output next to the video source file", () => {
    expect(
      suggestBuildOutputPath({
        tracks: [
          videoTrack,
          {
            key: "a",
            kind: "audio",
            sourceReleaseId: 1,
            sourceStreamIndex: 1,
            label: "Eng",
            audioMode: "transcode",
            transcodeCodec: "eac3",
            channelTarget: "up_to_51",
          },
        ],
        releases: [...releases],
        movieTitle: "Test",
        movieYear: null,
        releaseType: "",
        version: "theatrical",
      }),
    ).toBe(
      "/mnt/d/Movies/Ford_v_Ferrari.Remux.UHD.4K.Atmos.RusATMOS.eac3.51.mkv",
    );
  });

  it("returns null when video source has no path", () => {
    expect(
      suggestBuildOutputPath({
        tracks: [videoTrack],
        releases: [{ id: 1, filePath: null, audioTracks: [] }],
        movieTitle: "Test",
        movieYear: null,
        releaseType: "",
        version: "theatrical",
      }),
    ).toBeNull();
  });
});
