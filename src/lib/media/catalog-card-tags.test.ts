import { describe, expect, it } from "vitest";
import { catalogCardTags } from "@/lib/media/catalog-card-tags";
import type { ReleaseWithTracks } from "@/lib/movies/movie-include";

function release(partial: Partial<ReleaseWithTracks> & { id: number }): ReleaseWithTracks {
  return {
    id: partial.id,
    movieId: 1,
    externalStorageId: null,
    filePath: null,
    fileSize: null,
    fileMtime: null,
    fileHash: null,
    releaseType: partial.releaseType ?? "bdremux",
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

describe("catalogCardTags", () => {
  it("puts resolution/hdr/audio-3d tags before secondary tags", () => {
    const tags = catalogCardTags(
      release({
        id: 1,
        videoTrack: {
          id: 1,
          releaseId: 1,
          streamIndex: 0,
          width: 3840,
          height: 2160,
          resolutionLabel: "4K",
          codec: "hevc",
          hdr: "HDR10",
          fps: "24",
          bitrate: null,
        },
        audioTracks: [
          {
            id: 1,
            releaseId: 1,
            streamIndex: 0,
            language: "rus",
            isDefault: true,
            codec: "ac3",
            profile: null,
            channels: 6,
            channelLayout: "5.1",
            translationType: "dub",
            title: null,
            bitrate: null,
          },
        ],
      }),
    );

    const kinds = tags.map((t) => t.kind);
    const firstProminent = kinds.findIndex((k) =>
      ["resolution", "hdr", "audio-3d"].includes(k),
    );
    const firstSecondary = kinds.findIndex((k) =>
      ["release", "channel", "codec"].includes(k),
    );
    expect(firstProminent).toBeGreaterThanOrEqual(0);
    expect(firstSecondary).toBeGreaterThanOrEqual(0);
    expect(firstProminent).toBeLessThan(firstSecondary);
  });

  it("omits duplicate 4K resolution tag when premium 4K ribbon is shown elsewhere", () => {
    const tags = catalogCardTags(
      release({
        id: 2,
        videoTrack: {
          id: 1,
          releaseId: 2,
          streamIndex: 0,
          width: 3840,
          height: 2160,
          resolutionLabel: "4K",
          codec: "hevc",
          hdr: "HDR10",
          fps: "24",
          bitrate: null,
        },
      }),
    );

    const resolutionTags = tags.filter((t) => t.kind === "resolution");
    expect(resolutionTags).toHaveLength(0);
  });
});
