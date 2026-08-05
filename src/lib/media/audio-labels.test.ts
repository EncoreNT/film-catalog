import { describe, expect, it } from "vitest";
import { mainAudioTrack } from "@/lib/media/audio-labels";
import type { ReleaseWithTracks } from "@/lib/movies/movie-include";

function release(
  partial: Partial<ReleaseWithTracks> & { id: number },
): ReleaseWithTracks {
  return {
    id: partial.id,
    movieId: 1,
    moviePartId: null,
    externalStorageId: null,
    filePath: null,
    fileSize: null,
    fileMtime: null,
    fileDownloadedAt: null,
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

function audio(
  overrides: Partial<ReleaseWithTracks["audioTracks"][number]> = {},
) {
  return {
    id: 1,
    releaseId: 1,
    streamIndex: 0,
    language: "rus",
    isDefault: false,
    codec: "ac3",
    profile: null,
    channels: 6,
    channelLayout: "5.1",
    translationType: "dub",
    title: null,
    bitrate: 640,
    ...overrides,
  };
}

describe("mainAudioTrack", () => {
  it("выбирает главную дорожку, даже если есть лучший оригинал", () => {
    const track = mainAudioTrack(
      release({
        id: 1,
        audioTracks: [
          audio({
            id: 1,
            streamIndex: 0,
            isDefault: true,
            codec: "ac3",
            channels: 6,
            channelLayout: "5.1",
            translationType: "dub",
          }),
          audio({
            id: 2,
            streamIndex: 1,
            language: "eng",
            codec: "truehd",
            profile: "Atmos",
            channels: 8,
            channelLayout: "7.1",
            translationType: "original",
          }),
        ],
      }),
    );

    expect(track?.channelLayout).toBe("5.1");
    expect(track?.translationType).toBe("dub");
  });

  it("выбирает русский дубляж, если главная не отмечена", () => {
    const track = mainAudioTrack(
      release({
        id: 2,
        audioTracks: [
          audio({
            id: 1,
            streamIndex: 0,
            translationType: "dub",
            channelLayout: "5.1",
          }),
          audio({
            id: 2,
            streamIndex: 1,
            language: "eng",
            codec: "truehd",
            profile: "Atmos",
            channels: 8,
            channelLayout: "7.1",
            translationType: "original",
          }),
        ],
      }),
    );

    expect(track?.language).toBe("rus");
    expect(track?.channelLayout).toBe("5.1");
  });

  it("выбирает русский проф. многоголосный, если нет дубляжа", () => {
    const track = mainAudioTrack(
      release({
        id: 3,
        audioTracks: [
          audio({
            id: 1,
            streamIndex: 0,
            translationType: "pro_multi",
            channelLayout: "5.1",
          }),
          audio({
            id: 2,
            streamIndex: 1,
            language: "eng",
            codec: "truehd",
            profile: "Atmos",
            channels: 8,
            channelLayout: "7.1",
            translationType: "original",
          }),
        ],
      }),
    );

    expect(track?.translationType).toBe("pro_multi");
    expect(track?.channelLayout).toBe("5.1");
  });

  it("fallback на лучшую дорожку, если нет русских приоритетных", () => {
    const track = mainAudioTrack(
      release({
        id: 4,
        audioTracks: [
          audio({
            id: 1,
            streamIndex: 0,
            language: "eng",
            codec: "ac3",
            channels: 6,
            channelLayout: "5.1",
            translationType: "original",
          }),
          audio({
            id: 2,
            streamIndex: 1,
            language: "eng",
            codec: "truehd",
            profile: "Atmos",
            channels: 8,
            channelLayout: "7.1",
            translationType: "original",
          }),
        ],
      }),
    );

    expect(track?.profile).toBe("Atmos");
    expect(track?.channelLayout).toBe("7.1");
  });
});
