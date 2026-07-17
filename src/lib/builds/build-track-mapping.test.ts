import { describe, expect, it } from "vitest";
import type { FfprobeStream } from "@/lib/media/ffprobe-parse";
import { parseMkvIdentifyJson } from "@/lib/builds/build-inspection";
import {
  buildMkvmergeOutputPlan,
  type MkvMergeInputFile,
} from "@/lib/builds/build-mkvmerge";
import {
  resolveFfmpegAudioOrdinal,
  resolveInspectedMkvTrackId,
} from "@/lib/builds/build-track-inspect";
import type { InspectedReleaseFile } from "@/lib/builds/build-inspect-runtime";

const ffprobeStreams: FfprobeStream[] = [
  { index: 0, codec_type: "video" },
  { index: 1, codec_type: "audio" },
  { index: 2, codec_type: "audio" },
  { index: 3, codec_type: "audio" },
  { index: 4, codec_type: "audio" },
];

function inspectedFixture(): InspectedReleaseFile {
  return {
    releaseId: 10,
    filePath: "/in.mkv",
    durationSeconds: 7200,
    exactDurationSeconds: 7200,
    ffprobeStreams,
    mkv: parseMkvIdentifyJson(
      JSON.stringify({
        container: { properties: { duration: 7_200_000_000_000 } },
        tracks: [
          { id: 1, type: "video" },
          { id: 2, type: "audio" },
          { id: 3, type: "audio" },
          { id: 4, type: "audio" },
          { id: 5, type: "audio" },
        ],
      }),
    ),
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
      audio: [
        { streamIndex: 1, codec: "dts", profile: null, channels: 6, channelLayout: "5.1", bitrate: 768, language: "rus", title: "Dub, Blu-Ray", translationType: "dub", isDefault: true },
        { streamIndex: 2, codec: "truehd", profile: "Atmos", channels: 8, channelLayout: "7.1", bitrate: 5000, language: "eng", title: "Original", translationType: "original", isDefault: false },
        { streamIndex: 3, codec: "ac3", profile: null, channels: 6, channelLayout: "5.1", bitrate: 640, language: "rus", title: "AVO", translationType: "dub", isDefault: false },
        { streamIndex: 4, codec: "dts-hd ma", profile: null, channels: 8, channelLayout: "7.1", bitrate: 4900, language: "rus", title: "Dub, Custom", translationType: "dub", isDefault: false },
      ],
      subtitles: [],
    },
    catalog: {
      videoStreamIndex: 0,
      audioTracks: [
        { streamIndex: 0 },
        { streamIndex: 1 },
        { streamIndex: 2 },
        { streamIndex: 3 },
      ],
      subtitleTracks: [],
    },
  };
}

describe("build track mapping pipeline", () => {
  const inspected = inspectedFixture();

  it("maps the user recipe to distinct mkv and ffmpeg targets", () => {
    const dubMkv = resolveInspectedMkvTrackId(inspected, "audio", 0);
    const originalMkv = resolveInspectedMkvTrackId(inspected, "audio", 1);
    const customMkv = resolveInspectedMkvTrackId(inspected, "audio", 3);

    expect(dubMkv).toBe(2);
    expect(originalMkv).toBe(3);
    expect(customMkv).toBe(5);
    expect(new Set([dubMkv, originalMkv, customMkv]).size).toBe(3);

    expect(resolveFfmpegAudioOrdinal(inspected, 0)).toBe(0);
    expect(resolveFfmpegAudioOrdinal(inspected, 1)).toBe(1);
    expect(resolveFfmpegAudioOrdinal(inspected, 3)).toBe(3);
  });

  it("plans mux order and default flags for transcode + copies", () => {
    const inputFiles: MkvMergeInputFile[] = [
      {
        filePath: "/in.mkv",
        videoTrackIds: [1],
        audioTrackIds: [3, 5],
      },
      {
        filePath: "/tmp/.build-1-audio-1.mka",
        audioTrackIds: [1],
      },
    ];

    const resolvedTracks = [
      { sortOrder: 0, kind: "video" as const, syncFileIndex: 0, mkvTrackId: 1, isDefault: false },
      { sortOrder: 1, kind: "audio" as const, syncFileIndex: 1, mkvTrackId: 1, isDefault: true },
      { sortOrder: 2, kind: "audio" as const, syncFileIndex: 0, mkvTrackId: 3, isDefault: false },
      { sortOrder: 3, kind: "audio" as const, syncFileIndex: 0, mkvTrackId: 5, isDefault: false },
    ];

    const plan = buildMkvmergeOutputPlan(resolvedTracks);
    expect(plan.trackOrder).toEqual(["0:1", "1:1", "0:3", "0:5"]);
    expect(plan.defaultFlagsByFileIndex.get(1)).toEqual(["1"]);
    expect(plan.defaultFlagsByFileIndex.get(0)).toEqual(["3:0", "5:0"]);
    expect(inputFiles).toHaveLength(2);
  });
});
