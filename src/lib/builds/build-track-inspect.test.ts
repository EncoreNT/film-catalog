import { describe, expect, it } from "vitest";
import type { ReleaseWithTracks } from "@/lib/movies/movie-include";
import type { InspectedReleaseFile } from "@/lib/builds/build-inspect-runtime";
import {
  resolveCatalogAudioTrack,
} from "@/lib/builds/build-track-source";
import {
  resolveFfmpegAudioOrdinal,
  resolveInspectedAudioTrack,
  resolveInspectedGlobalStreamIndex,
  resolveInspectedMkvTrackId,
  resolveMkvTrackIdFromGlobalIndex,
} from "@/lib/builds/build-track-inspect";
import type { FfprobeStream } from "@/lib/media/ffprobe-parse";
import { parseMkvIdentifyJson } from "@/lib/builds/build-inspection";

const ffprobeStreams: FfprobeStream[] = [
  { index: 0, codec_type: "video" },
  { index: 1, codec_type: "audio" },
  { index: 2, codec_type: "audio" },
  { index: 3, codec_type: "audio" },
  { index: 4, codec_type: "audio" },
  { index: 5, codec_type: "subtitle" },
  { index: 6, codec_type: "subtitle" },
];

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

function mkInspected(
  release: ReleaseWithTracks,
  catalogUsesOrdinals: boolean,
): InspectedReleaseFile {
  const audio = release.audioTracks.map((track, index) => ({
    streamIndex: catalogUsesOrdinals ? index : track.streamIndex,
    codec: track.codec,
    profile: track.profile,
    channels: track.channelLayout === "7.1" ? 8 : 6,
    channelLayout: track.channelLayout,
    bitrate: track.bitrate,
    language: track.language,
    title: track.title,
    translationType: track.translationType,
    isDefault: track.isDefault,
  }));

  const mkvJson = {
    container: { properties: { duration: 7_200_000_000_000 } },
    tracks: [
      { id: 1, type: "video", codec: "V_MPEGH/ISO/HEVC" },
      { id: 2, type: "audio", codec: "A_DTS" },
      { id: 3, type: "audio", codec: "A_TRUEHD" },
      { id: 4, type: "audio", codec: "A_AC3" },
      { id: 5, type: "audio", codec: "A_DTS" },
      { id: 6, type: "subtitles", codec: "S_TEXT/UTF8" },
      { id: 7, type: "subtitles", codec: "S_TEXT/UTF8" },
    ],
  };

  return {
    releaseId: release.id,
    filePath: release.filePath!,
    durationSeconds: 7200,
    exactDurationSeconds: 7200,
    ffprobeStreams,
    mkv: parseMkvIdentifyJson(JSON.stringify(mkvJson)),
    probe: {
      durationSeconds: 7200,
      video: {
        streamIndex: 0,
        codec: "hevc",
        width: 3840,
        height: 2160,
        resolutionLabel: "4K",
        hdr: "DV:P8",
        fps: "23.976",
        bitrate: 41_400,
      },
      audio,
      subtitles: release.subtitleTracks.map((track, index) => ({
        streamIndex: catalogUsesOrdinals ? index : track.streamIndex,
        codec: "subrip",
        codecLabel: "SRT",
        language: track.language,
        title: track.title,
        isDefault: track.isDefault,
        forced: track.forced,
      })),
    },
    catalog: {
      videoStreamIndex: release.videoTrack?.streamIndex ?? 0,
      audioTracks: release.audioTracks.map((track) => ({
        streamIndex: track.streamIndex,
      })),
      subtitleTracks: release.subtitleTracks.map((track) => ({
        streamIndex: track.streamIndex,
      })),
    },
  };
}

describe("inspected stream resolution", () => {
  const ordinalRelease = mkRelease([0, 1, 2, 3], [0, 1]);
  const globalRelease = mkRelease([1, 2, 3, 4]);
  const ordinalInspected = mkInspected(ordinalRelease, true);
  const globalInspected = mkInspected(globalRelease, false);

  it("maps ordinal catalog refs to the intended ffprobe streams", () => {
    expect(resolveInspectedAudioTrack(ordinalInspected, 0)?.title).toBe("Dub, Blu-Ray");
    expect(resolveInspectedAudioTrack(ordinalInspected, 1)?.title).toBe("Original");
    expect(resolveInspectedAudioTrack(ordinalInspected, 3)?.title).toBe("Dub, Custom");
    expect(resolveInspectedGlobalStreamIndex(ordinalInspected, "audio", 1)).toBe(2);
  });

  it("maps global catalog refs without ambiguity", () => {
    expect(resolveInspectedAudioTrack(globalInspected, 2)?.title).toBe("Original");
    expect(resolveInspectedGlobalStreamIndex(globalInspected, "audio", 4)).toBe(4);
  });

  it("resolves mkv track ids for each recipe audio track", () => {
    expect(resolveInspectedMkvTrackId(ordinalInspected, "audio", 0)).toBe(2);
    expect(resolveInspectedMkvTrackId(ordinalInspected, "audio", 1)).toBe(3);
    expect(resolveInspectedMkvTrackId(ordinalInspected, "audio", 3)).toBe(5);
    expect(resolveInspectedMkvTrackId(ordinalInspected, "video", 0)).toBe(1);
    expect(resolveInspectedMkvTrackId(ordinalInspected, "subtitle", 1)).toBe(7);
  });

  it("returns ffmpeg audio ordinals aligned with ffprobe", () => {
    expect(resolveFfmpegAudioOrdinal(ordinalInspected, 0)).toBe(0);
    expect(resolveFfmpegAudioOrdinal(ordinalInspected, 1)).toBe(1);
    expect(resolveFfmpegAudioOrdinal(ordinalInspected, 3)).toBe(3);
  });
});

describe("pipeline consistency", () => {
  it("maps a three-audio recipe the same way in catalog, validate and run layers", () => {
    const release = mkRelease([0, 1, 2, 3], [0, 1]);
    const inspected = mkInspected(release, true);
    const recipe = [
      { kind: "audio" as const, sourceStreamIndex: 0, label: "Dub, Blu-Ray" },
      { kind: "audio" as const, sourceStreamIndex: 3, label: "Dub, Custom" },
      { kind: "audio" as const, sourceStreamIndex: 1, label: "Original" },
    ];

    for (const track of recipe) {
      const catalog = resolveCatalogAudioTrack(release, track.sourceStreamIndex);
      const probed = resolveInspectedAudioTrack(inspected, track.sourceStreamIndex);
      const mkvId = resolveInspectedMkvTrackId(inspected, track.kind, track.sourceStreamIndex);

      expect(catalog?.title).toBe(track.label);
      expect(probed?.title).toBe(track.label);
      expect(mkvId).not.toBeNull();
    }

    expect(resolveFfmpegAudioOrdinal(inspected, 0)).toBe(0);
    expect(resolveInspectedGlobalStreamIndex(inspected, "audio", 1)).toBe(2);
    expect(resolveInspectedGlobalStreamIndex(inspected, "audio", 3)).toBe(4);
    expect(resolveMkvTrackIdFromGlobalIndex(inspected, "audio", 2)).toBe(3);
    expect(resolveMkvTrackIdFromGlobalIndex(inspected, "audio", 4)).toBe(5);
  });
});
