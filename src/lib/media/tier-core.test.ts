import { describe, expect, it } from "vitest";
import {
  buildSpotlightFromVisual,
  inferTierFrom4kHdrAndAudioTracks,
  matchesCatalogGoldFilter,
  matchesCatalogRubyFilter,
  maxReleaseTier,
  maxSpotlightTier,
  resolveCatalogFilterSpotlightTier,
} from "@/lib/media/tier-core";
import type { ReleaseWithTracks } from "@/lib/movies/movie-include";

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

function release(partial: Partial<ReleaseWithTracks> & { id: number }): ReleaseWithTracks {
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
    subtitleTracks: [],
  };
}

describe("maxReleaseTier", () => {
  it("prefers ruby over gold", () => {
    expect(maxReleaseTier("gold", "ruby")).toBe("ruby");
    expect(maxReleaseTier(null, "gold")).toBe("gold");
  });
});

describe("maxSpotlightTier", () => {
  it("follows ruby > gold > standard > general", () => {
    expect(maxSpotlightTier(["standard", "gold"])).toBe("gold");
    expect(maxSpotlightTier([null, "standard"])).toBe("standard");
    expect(maxSpotlightTier([null])).toBe("general");
  });
});

describe("resolveCatalogFilterSpotlightTier", () => {
  it("maps filter combos to spotlight", () => {
    expect(
      resolveCatalogFilterSpotlightTier({
        resolution: "4K",
        hdr: "HDR10",
        premiumAudio: "true",
      }),
    ).toBe("ruby");
    expect(
      resolveCatalogFilterSpotlightTier({
        resolution: "4K",
        hdr: "HDR_ANY",
        premiumAudio: null,
      }),
    ).toBe("gold");
  });
});

describe("matchesCatalogGoldFilter / matchesCatalogRubyFilter", () => {
  it("matches exact rail filter params", () => {
    expect(
      matchesCatalogGoldFilter({ resolution: "4K", hdr: "HDR_ANY", premiumAudio: null }),
    ).toBe(true);
    expect(
      matchesCatalogRubyFilter({
        resolution: "4K",
        hdr: "HDR_ANY",
        premiumAudio: "true",
      }),
    ).toBe(true);
  });
});

describe("inferTierFrom4kHdrAndAudioTracks", () => {
  it("returns ruby for rus dub Atmos 7.1", () => {
    const videoRelease = release({
      id: 1,
      videoTrack: video("HDR10"),
    });
    const tier = inferTierFrom4kHdrAndAudioTracks(videoRelease, [
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
    ]);
    expect(tier).toBe("ruby");
  });
});

describe("buildSpotlightFromVisual", () => {
  it("maps visual tiers to spotlight", () => {
    expect(buildSpotlightFromVisual("ruby")).toBe("ruby");
    expect(buildSpotlightFromVisual(null)).toBe("general");
  });
});
