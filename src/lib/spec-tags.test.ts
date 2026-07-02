import { describe, expect, it } from "vitest";
import {
  premiumHdrView,
  secondaryTags,
} from "./spec-tags";
import type { ReleaseWithTracks } from "./movie-query";

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
    audioTracks: partial.audioTracks ?? [],
    subtitleTracks: partial.subtitleTracks ?? [],
  };
}

function video(hdr: string | null) {
  return {
    id: 1,
    releaseId: 1,
    streamIndex: 0,
    width: 3840,
    height: 2160,
    resolutionLabel: "4K",
    codec: "hevc",
    hdr,
    fps: "24",
    bitrate: 50000000,
  };
}

describe("premiumHdrView", () => {
  it("возвращает null, если видеотрека нет", () => {
    expect(premiumHdrView(release({ id: 1 }))).toBeNull();
  });

  it("возвращает null для SDR", () => {
    expect(
      premiumHdrView(release({ id: 1, videoTrack: video("SDR") })),
    ).toBeNull();
  });

  it("сводит HDR10 к плоскому лейблу", () => {
    expect(premiumHdrView(release({ id: 1, videoTrack: video("HDR10") }))).toEqual(
      { label: "HDR10", isDolbyVision: false },
    );
  });

  it("сводит HDR10+ к плоскому лейблу", () => {
    expect(
      premiumHdrView(release({ id: 1, videoTrack: video("HDR10+") })),
    ).toEqual({ label: "HDR10+", isDolbyVision: false });
  });

  it("форматирует Dolby Vision с профилем", () => {
    expect(
      premiumHdrView(release({ id: 1, videoTrack: video("DV:P8.1") })),
    ).toEqual({
      label: "Dolby Vision · Profile 8.1",
      isDolbyVision: true,
    });
  });

  it("форматирует Dolby Vision без профиля", () => {
    expect(
      premiumHdrView(release({ id: 1, videoTrack: video("DV:") })),
    ).toEqual({ label: "Dolby Vision", isDolbyVision: true });
  });
});

describe("secondaryTags", () => {
  it("не дублирует разрешение, HDR и объектный звук — они в spec-ribbon", () => {
    const tags = secondaryTags(
      release({
        id: 1,
        releaseType: "bdremux",
        videoTrack: video("DV:P8.1"),
        audioTracks: [
          {
            id: 1,
            releaseId: 1,
            streamIndex: 0,
            language: "rus",
            isDefault: true,
            codec: "truehd",
            profile: "Atmos",
            channels: 8,
            channelLayout: "7.1",
            translationType: "dub",
            title: null,
            bitrate: 4000,
          },
        ],
      }),
    );

    const kinds = tags.map((t) => t.kind);
    expect(kinds).not.toContain("resolution");
    expect(kinds).not.toContain("hdr");
    expect(kinds).not.toContain("audio-3d");
    // source и каналы остаются вторичными бейджами
    expect(kinds).toContain("release");
    expect(kinds).toContain("channel");
  });
});
