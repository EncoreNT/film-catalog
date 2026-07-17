import { describe, expect, it } from "vitest";
import type { FfprobeStream } from "@/lib/media/ffprobe-parse";
import { parseMkvIdentifyJson } from "@/lib/builds/build-inspection";
import type { InspectedReleaseFile } from "@/lib/builds/build-inspect-runtime";
import {
  resolveFfprobeGlobalStreamIndex,
} from "@/lib/builds/build-stream-resolve";
import {
  resolveFfmpegAudioOrdinal,
  resolveInspectedAudioTrack,
  resolveInspectedGlobalStreamIndex,
  resolveInspectedMkvTrackId,
} from "@/lib/builds/build-track-inspect";

/**
 * Regression for release #4 (Alita): catalog stores ordinal keys 0–8,
 * live ffprobe uses globals 1–9. Without catalog-aware resolve, refs 1 and 7
 * mapped to Dub Blu-Ray and AVO Ю.Сербин instead of Custom and TrueHD Original.
 */
describe("Alita build #2 recipe regression", () => {
  const ffprobeStreams: FfprobeStream[] = [
    { index: 0, codec_type: "video" },
    ...Array.from({ length: 9 }, (_, i) => ({
      index: i + 1,
      codec_type: "audio" as const,
    })),
    ...Array.from({ length: 5 }, (_, i) => ({
      index: i + 10,
      codec_type: "subtitle" as const,
    })),
  ];

  const catalogAudio = [
    { streamIndex: 0, title: "Dub, Blu-Ray" },
    { streamIndex: 1, title: "Dub, Custom" },
    { streamIndex: 2, title: "MVO, СВ Студия" },
    { streamIndex: 3, title: "MVO, HDRezka Studio" },
    { streamIndex: 4, title: "AVO, Л.Володарский" },
    { streamIndex: 5, title: "AVO, А.Дольский" },
    { streamIndex: 6, title: "AVO, Ю.Сербин" },
    { streamIndex: 7, title: "Original" },
    { streamIndex: 8, title: "Original" },
  ];

  const probeAudio = catalogAudio.map((row, position) => ({
    streamIndex: position + 1,
    codec:
      position === 0
        ? "dts"
        : position === 1
          ? "dts-hd"
          : position === 7
            ? "truehd"
            : "ac3",
    profile: position === 7 ? "Atmos" : null,
    channels: position === 1 || position === 7 ? 8 : 6,
    channelLayout: position === 1 || position === 7 ? "7.1" : "5.1",
    bitrate: 768,
    language: position === 7 ? "eng" : "rus",
    title: row.title,
    translationType: position === 7 ? "original" : "dub",
    isDefault: position === 0,
  }));

  const inspected: InspectedReleaseFile = {
    releaseId: 4,
    filePath: "/in/alita.mkv",
    durationSeconds: 7200,
    exactDurationSeconds: 7200,
    ffprobeStreams,
    mkv: parseMkvIdentifyJson(
      JSON.stringify({
        container: { properties: { duration: 7_200_000_000_000 } },
        tracks: [
          { id: 0, type: "video" },
          ...Array.from({ length: 9 }, (_, i) => ({ id: i + 1, type: "audio" })),
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
      audio: probeAudio,
      subtitles: [],
    },
    catalog: {
      videoStreamIndex: 0,
      audioTracks: catalogAudio.map(({ streamIndex }) => ({ streamIndex })),
      subtitleTracks: [],
    },
  };

  it("reproduces the old broken mapping without catalog rows", () => {
    expect(
      resolveFfprobeGlobalStreamIndex(
        ffprobeStreams,
        "audio",
        1,
        probeAudio,
      ),
    ).toBe(1);
    expect(
      resolveFfprobeGlobalStreamIndex(
        ffprobeStreams,
        "audio",
        7,
        probeAudio,
      ),
    ).toBe(7);
  });

  it("maps build #2 audio recipe to distinct source streams", () => {
    const recipe = [
      { ref: 0, title: "Dub, Blu-Ray", mkv: 1, ffmpeg: 0, global: 1 },
      { ref: 1, title: "Dub, Custom", mkv: 2, ffmpeg: 1, global: 2 },
      { ref: 7, title: "Original", mkv: 8, ffmpeg: 7, global: 8 },
    ] as const;

    const mkvIds = new Set<number>();
    for (const track of recipe) {
      expect(resolveInspectedGlobalStreamIndex(inspected, "audio", track.ref)).toBe(
        track.global,
      );
      expect(resolveInspectedAudioTrack(inspected, track.ref)?.title).toBe(track.title);
      expect(resolveInspectedMkvTrackId(inspected, "audio", track.ref)).toBe(track.mkv);
      expect(resolveFfmpegAudioOrdinal(inspected, track.ref)).toBe(track.ffmpeg);
      mkvIds.add(track.mkv);
    }
    expect(mkvIds.size).toBe(3);
  });
});
