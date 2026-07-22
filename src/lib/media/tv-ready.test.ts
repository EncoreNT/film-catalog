import { describe, expect, it } from "vitest";
import {
  isTvReadyRelease,
  mainRussianTrack,
  tvReadyBadgeLabel,
  tvReadyFilterChipLabel,
  tvReadyMarkDetail,
  tvReadyMarkLabel,
} from "@/lib/media/tv-ready";
import type { ReleaseWithTracks } from "@/lib/movies/movie-include";

function release(
  partial: Partial<ReleaseWithTracks> & { id: number },
): ReleaseWithTracks {
  return {
    id: partial.id,
    movieId: 1,
    externalStorageId: null,
    filePath: partial.filePath ?? "/mnt/d/Movies/film.mkv",
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

function video(codec = "hevc") {
  return {
    id: 1,
    releaseId: 1,
    streamIndex: 0,
    width: 3840,
    height: 2160,
    resolutionLabel: "4K",
    codec,
    hdr: "HDR10",
    fps: "24",
    bitrate: 50000000,
  };
}

function audio(
  overrides: Partial<ReleaseWithTracks["audioTracks"][number]> = {},
) {
  return {
    id: 1,
    releaseId: 1,
    streamIndex: 0,
    language: "rus",
    isDefault: true,
    codec: "eac3",
    profile: null,
    channels: 6,
    channelLayout: "5.1",
    translationType: "dub",
    title: null,
    bitrate: 768,
    ...overrides,
  };
}

describe("mainRussianTrack", () => {
  it("prefers default Russian track", () => {
    const track = mainRussianTrack(
      release({
        id: 1,
        audioTracks: [
          audio({ streamIndex: 0, isDefault: false, codec: "ac3" }),
          audio({ streamIndex: 1, isDefault: true, codec: "eac3" }),
        ],
      }),
    );
    expect(track?.codec).toBe("eac3");
  });

  it("falls back to first Russian track when no default", () => {
    const track = mainRussianTrack(
      release({
        id: 1,
        audioTracks: [
          audio({ streamIndex: 2, isDefault: false, codec: "ac3" }),
          audio({ streamIndex: 0, isDefault: false, codec: "eac3" }),
        ],
      }),
    );
    expect(track?.streamIndex).toBe(0);
  });
});

describe("isTvReadyRelease", () => {
  it("returns true for MKV with HEVC and default Russian E-AC-3", () => {
    expect(
      isTvReadyRelease(
        release({
          id: 1,
          videoTrack: video("hevc"),
          audioTracks: [audio({ codec: "eac3", isDefault: true })],
        }),
      ),
    ).toBe(true);
  });

  it("returns false when main Russian track is TrueHD without TV fallback", () => {
    expect(
      isTvReadyRelease(
        release({
          id: 1,
          videoTrack: video("hevc"),
          audioTracks: [audio({ codec: "truehd", isDefault: true })],
        }),
      ),
    ).toBe(false);
  });

  it("returns true when any Russian track is E-AC-3, even if default is TrueHD", () => {
    expect(
      isTvReadyRelease(
        release({
          id: 1,
          videoTrack: video("hevc"),
          audioTracks: [
            audio({ streamIndex: 0, codec: "truehd", isDefault: true }),
            audio({ streamIndex: 1, codec: "eac3", isDefault: false }),
          ],
        }),
      ),
    ).toBe(true);
  });

  it("returns false for non-MKV container", () => {
    expect(
      isTvReadyRelease(
        release({
          id: 1,
          filePath: "/mnt/d/Movies/film.mp4",
          videoTrack: video("h264"),
          audioTracks: [audio({ codec: "aac" })],
        }),
      ),
    ).toBe(false);
  });

  it("returns false without Russian track", () => {
    expect(
      isTvReadyRelease(
        release({
          id: 1,
          videoTrack: video("hevc"),
          audioTracks: [audio({ language: "eng", codec: "ac3" })],
        }),
      ),
    ).toBe(false);
  });
});

describe("tvReadyBadgeLabel", () => {
  it("returns TV", () => {
    expect(tvReadyBadgeLabel()).toBe("TV");
  });
});

describe("tvReadyMarkLabel", () => {
  it("returns catalog mark label", () => {
    expect(tvReadyMarkLabel()).toBe("Читается телевизором");
    expect(tvReadyMarkDetail()).toContain("MKV");
    expect(tvReadyFilterChipLabel()).toBe("Для телевизора");
  });
});
