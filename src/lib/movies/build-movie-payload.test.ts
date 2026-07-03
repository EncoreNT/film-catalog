import { describe, expect, it } from "vitest";
import {
  buildAudioTracksPayload,
  buildMovieCreatePayload,
  buildMovieUpdatePayload,
  buildReleaseUpdatePayload,
  buildSubtitleTracksPayload,
  buildVideoTrackPayload,
} from "@/lib/movies/build-movie-payload";
import type {
  AudioFormRow,
  SubtitleFormRow,
  VideoFieldState,
} from "@/lib/movies/movie-form-types";

const video: VideoFieldState = {
  codec: " hevc ",
  hdr: "HDR10",
  resolutionLabel: " 4K ",
  width: 3840,
  height: 2160,
  fps: "24",
  bitrate: 50000000,
};

const audioRow: AudioFormRow = {
  rowKey: "a1",
  codec: "truehd",
  profile: "Atmos",
  channelLayout: "7.1",
  language: "rus",
  translationType: "dub",
  bitrate: 3000000,
  title: " Russian ",
  isDefault: true,
};

const emptyAudioRow: AudioFormRow = {
  rowKey: "a2",
  codec: "",
  profile: "None",
  channelLayout: "",
  language: "",
  translationType: "",
  bitrate: null,
  title: "",
  isDefault: false,
};

const subtitleRow: SubtitleFormRow = {
  rowKey: "s1",
  codecLabel: "SRT",
  language: "rus",
  title: "",
  isDefault: false,
  forced: true,
};

describe("buildVideoTrackPayload", () => {
  it("trims string fields and keeps numeric values", () => {
    expect(buildVideoTrackPayload(video)).toEqual({
      width: 3840,
      height: 2160,
      resolutionLabel: "4K",
      codec: "hevc",
      hdr: "HDR10",
      fps: "24",
      bitrate: 50000000,
    });
  });
});

describe("buildAudioTracksPayload", () => {
  it("maps rows with streamIndex and null profile None", () => {
    expect(buildAudioTracksPayload([audioRow])).toEqual([
      {
        streamIndex: 0,
        codec: "truehd",
        profile: "Atmos",
        channelLayout: "7.1",
        language: "rus",
        translationType: "dub",
        bitrate: 3000000,
        title: "Russian",
        isDefault: true,
      },
    ]);
  });

  it("filters empty rows when filterEmpty is set", () => {
    expect(
      buildAudioTracksPayload([emptyAudioRow, audioRow], { filterEmpty: true }),
    ).toHaveLength(1);
  });
});

describe("buildSubtitleTracksPayload", () => {
  it("maps subtitle rows with streamIndex", () => {
    expect(buildSubtitleTracksPayload([subtitleRow])).toEqual([
      {
        streamIndex: 0,
        codecLabel: "SRT",
        language: "rus",
        forced: true,
        isDefault: false,
        title: null,
      },
    ]);
  });
});

describe("buildMovieCreatePayload", () => {
  it("builds catalog create payload with nested release and filtered tracks", () => {
    const payload = buildMovieCreatePayload({
      title: " Inception ",
      year: 2010,
      description: null,
      externalStorageId: null,
      releaseType: " bdremux ",
      genres: ["sci-fi"],
      durationSeconds: 8880,
      filePath: "/films/inception.mkv",
      video,
      audioRows: [emptyAudioRow, audioRow],
      subtitleRows: [subtitleRow],
    });

    expect(payload.title).toBe("Inception");
    expect(payload.status).toBe("CATALOG");
    expect(payload.release?.releaseType).toBe("bdremux");
    expect(payload.release?.skipProbe).toBe(true);
    expect(payload.release?.audioTracks).toHaveLength(1);
    expect(payload.release?.subtitleTracks).toHaveLength(1);
  });
});

describe("buildMovieUpdatePayload", () => {
  it("converts watchedAt to ISO string", () => {
    const payload = buildMovieUpdatePayload({
      title: "Test",
      year: 2000,
      description: null,
      genres: [],
      rating: 8,
      watchedAt: "2024-01-15T10:00:00.000Z",
    });
    expect(payload.watchedAt).toBe("2024-01-15T10:00:00.000Z");
  });
});

describe("buildReleaseUpdatePayload", () => {
  it("includes file meta when provided", () => {
    const payload = buildReleaseUpdatePayload({
      releaseType: "web-dl",
      filePath: "/a.mkv",
      fileMeta: {
        fileSize: 100,
        fileMtime: "2024-01-01T00:00:00.000Z",
        fileHash: "abc",
      },
      externalStorageId: 2,
      durationSeconds: 3600,
      video,
      audioRows: [audioRow],
      subtitleRows: [subtitleRow],
    });
    expect(payload.fileSize).toBe(100);
    expect(payload.fileHash).toBe("abc");
    expect(payload.externalStorageId).toBe(2);
  });
});
