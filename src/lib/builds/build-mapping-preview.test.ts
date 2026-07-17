import { describe, expect, it } from "vitest";
import type { InspectedReleaseFile } from "@/lib/builds/build-inspect-runtime";
import { parseMkvIdentifyJson } from "@/lib/builds/build-inspection";
import type { FfprobeStream } from "@/lib/media/ffprobe-parse";
import {
  buildRecipeMappingPreview,
  mappingPreviewValidationErrors,
} from "@/lib/builds/build-mapping-preview";

const ffprobeStreams: FfprobeStream[] = [
  { index: 0, codec_type: "video" },
  ...Array.from({ length: 9 }, (_, i) => ({
    index: i + 1,
    codec_type: "audio" as const,
  })),
];

function alitaInspected(): InspectedReleaseFile {
  const titles = [
    "Dub, Blu-Ray",
    "Dub, Custom",
    "MVO, СВ Студия",
    "MVO, HDRezka Studio",
    "AVO, Л.Володарский",
    "AVO, А.Дольский",
    "AVO, Ю.Сербин",
    "Original",
    "Original",
  ];
  return {
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
      audio: titles.map((title, position) => ({
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
        title,
        translationType: position === 7 ? "original" : "dub",
        isDefault: position === 0,
      })),
      subtitles: [],
    },
    catalog: {
      videoStreamIndex: 0,
      audioTracks: titles.map((_, index) => ({ streamIndex: index })),
      subtitleTracks: [],
    },
  };
}

describe("buildRecipeMappingPreview", () => {
  const inspected = new Map<number, InspectedReleaseFile>([[4, alitaInspected()]]);

  it("maps Alita build #2 recipe to distinct file streams", () => {
    const recipe = {
      outputPath: "/out.mkv",
      outputReleaseType: "bdremux",
      outputVersion: "theatrical",
      externalStorageId: null,
      tracks: [
        { kind: "video" as const, sourceReleaseId: 4, sourceStreamIndex: 0, label: "Видео" },
        {
          kind: "audio" as const,
          sourceReleaseId: 4,
          sourceStreamIndex: 0,
          label: "Dub, Blu-Ray",
          audioMode: "transcode" as const,
          transcodeCodec: "eac3" as const,
          transcodeBitrate: 768,
          channelTarget: "up_to_51" as const,
        },
        {
          kind: "audio" as const,
          sourceReleaseId: 4,
          sourceStreamIndex: 1,
          label: "Dub, Custom",
          audioMode: "copy" as const,
        },
        {
          kind: "audio" as const,
          sourceReleaseId: 4,
          sourceStreamIndex: 7,
          label: "Original",
          audioMode: "copy" as const,
        },
      ],
    };

    const preview = buildRecipeMappingPreview(recipe, inspected);
    const audio = preview.filter((row) => row.kind === "audio");

    expect(audio[0]).toMatchObject({
      label: "Dub, Blu-Ray",
      resolvedTitle: "Dub, Blu-Ray",
      ffprobeGlobalIndex: 1,
      mkvTrackId: 1,
      ffmpegMap: "0:a:0",
      action: "transcode",
    });
    expect(audio[1]).toMatchObject({
      label: "Dub, Custom",
      resolvedTitle: "Dub, Custom",
      ffprobeGlobalIndex: 2,
      mkvTrackId: 2,
      action: "copy",
    });
    expect(audio[2]).toMatchObject({
      label: "Original",
      resolvedTitle: "Original",
      ffprobeGlobalIndex: 8,
      mkvTrackId: 8,
      action: "copy",
    });

    expect(new Set(audio.map((row) => row.mkvTrackId)).size).toBe(3);
    expect(mappingPreviewValidationErrors(preview, recipe)).toEqual([]);
  });

  it("flags title mismatch that indicates broken ordinal/global resolve", () => {
    const recipe = {
      outputPath: "/out.mkv",
      outputReleaseType: null,
      outputVersion: "theatrical",
      externalStorageId: null,
      tracks: [
        {
          kind: "audio" as const,
          sourceReleaseId: 4,
          sourceStreamIndex: 7,
          label: "Original",
          audioMode: "copy" as const,
        },
      ],
    };

    const preview = buildRecipeMappingPreview(recipe, inspected);
    preview[0] = {
      ...preview[0]!,
      resolvedTitle: "AVO, Ю.Сербин",
      ffprobeGlobalIndex: 7,
      mkvTrackId: 7,
    };

    const errors = mappingPreviewValidationErrors(preview, recipe);
    expect(errors.some((e) => e.code === "mapping_title_mismatch")).toBe(true);
  });
});
