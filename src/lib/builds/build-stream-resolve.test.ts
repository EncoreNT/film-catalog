import { describe, expect, it } from "vitest";
import {
  resolveFfprobeGlobalStreamIndex,
  resolveProbeAudioTrack,
  resolveProbeSubtitleTrack,
} from "@/lib/builds/build-stream-resolve";
import type { FfprobeStream } from "@/lib/media/ffprobe-parse";

const streams: FfprobeStream[] = [
  { index: 0, codec_type: "video" },
  { index: 1, codec_type: "audio" },
  { index: 2, codec_type: "audio" },
  { index: 3, codec_type: "subtitle" },
  { index: 4, codec_type: "subtitle" },
];

describe("resolveFfprobeGlobalStreamIndex", () => {
  it("accepts ffprobe global stream index", () => {
    expect(resolveFfprobeGlobalStreamIndex(streams, "audio", 2)).toBe(2);
    expect(resolveFfprobeGlobalStreamIndex(streams, "subtitle", 4)).toBe(4);
  });

  it("maps legacy ordinal among type to global index", () => {
    const sparse = [
      { index: 0, codec_type: "video" },
      { index: 5, codec_type: "audio" },
      { index: 7, codec_type: "audio" },
      { index: 11, codec_type: "subtitle" },
      { index: 13, codec_type: "subtitle" },
    ] as FfprobeStream[];

    expect(resolveFfprobeGlobalStreamIndex(sparse, "audio", 0)).toBe(5);
    expect(resolveFfprobeGlobalStreamIndex(sparse, "audio", 1)).toBe(7);
    expect(resolveFfprobeGlobalStreamIndex(sparse, "subtitle", 0)).toBe(11);
    expect(resolveFfprobeGlobalStreamIndex(sparse, "subtitle", 1)).toBe(13);
  });

  it("returns null for out-of-range refs", () => {
    expect(resolveFfprobeGlobalStreamIndex(streams, "audio", 9)).toBeNull();
    expect(resolveFfprobeGlobalStreamIndex(streams, "video", 1)).toBeNull();
  });

  it("falls back to parsed probe tracks when raw ffprobe streams are empty", () => {
    const probeAudio = [{ streamIndex: 5 }, { streamIndex: 7 }];
    expect(
      resolveFfprobeGlobalStreamIndex([], "audio", 0, probeAudio),
    ).toBe(5);
    expect(
      resolveFfprobeGlobalStreamIndex([], "audio", 1, probeAudio),
    ).toBe(7);
    expect(
      resolveFfprobeGlobalStreamIndex([], "audio", 7, probeAudio),
    ).toBe(7);
  });

  it("prefers ordinal when streamRef matches another track global index", () => {
    const multiAudio = [
      { index: 0, codec_type: "video" },
      { index: 1, codec_type: "audio" },
      { index: 2, codec_type: "audio" },
      { index: 3, codec_type: "audio" },
      { index: 4, codec_type: "audio" },
    ] as FfprobeStream[];
    const ordinalProbe = [
      { streamIndex: 0 },
      { streamIndex: 1 },
      { streamIndex: 2 },
      { streamIndex: 3 },
    ];

    expect(
      resolveFfprobeGlobalStreamIndex(multiAudio, "audio", 1, ordinalProbe),
    ).toBe(2);
    expect(
      resolveFfprobeGlobalStreamIndex(multiAudio, "audio", 3, ordinalProbe),
    ).toBe(4);
  });

  it("keeps global indices when catalog stores ffprobe stream ids", () => {
    const multiAudio = [
      { index: 0, codec_type: "video" },
      { index: 1, codec_type: "audio" },
      { index: 2, codec_type: "audio" },
      { index: 3, codec_type: "audio" },
      { index: 4, codec_type: "audio" },
    ] as FfprobeStream[];
    const globalProbe = [
      { streamIndex: 1 },
      { streamIndex: 2 },
      { streamIndex: 3 },
      { streamIndex: 4 },
    ];
    const globalCatalog = [
      { streamIndex: 1 },
      { streamIndex: 2 },
      { streamIndex: 3 },
      { streamIndex: 4 },
    ];

    expect(
      resolveFfprobeGlobalStreamIndex(
        multiAudio,
        "audio",
        2,
        globalProbe,
        globalCatalog,
      ),
    ).toBe(2);
    expect(
      resolveFfprobeGlobalStreamIndex(
        multiAudio,
        "audio",
        4,
        globalProbe,
        globalCatalog,
      ),
    ).toBe(4);
  });

  it("maps ordinal catalog keys when live probe uses ffprobe globals", () => {
    const multiAudio = [
      { index: 0, codec_type: "video" },
      { index: 1, codec_type: "audio" },
      { index: 2, codec_type: "audio" },
      { index: 3, codec_type: "audio" },
      { index: 4, codec_type: "audio" },
    ] as FfprobeStream[];
    const globalProbe = [
      { streamIndex: 1 },
      { streamIndex: 2 },
      { streamIndex: 3 },
      { streamIndex: 4 },
    ];
    const ordinalCatalog = [
      { streamIndex: 0 },
      { streamIndex: 1 },
      { streamIndex: 2 },
      { streamIndex: 3 },
    ];

    expect(
      resolveFfprobeGlobalStreamIndex(
        multiAudio,
        "audio",
        0,
        globalProbe,
        ordinalCatalog,
      ),
    ).toBe(1);
    expect(
      resolveFfprobeGlobalStreamIndex(
        multiAudio,
        "audio",
        1,
        globalProbe,
        ordinalCatalog,
      ),
    ).toBe(2);
    expect(
      resolveFfprobeGlobalStreamIndex(
        multiAudio,
        "audio",
        3,
        globalProbe,
        ordinalCatalog,
      ),
    ).toBe(4);
  });
});

describe("resolveProbeAudioTrack", () => {
  const probe = {
    audio: [
      {
        streamIndex: 1,
        codec: "ac3",
        profile: null,
        channels: 6,
        channelLayout: "5.1",
        bitrate: 640,
        language: "rus",
        title: "Rus",
        translationType: null,
        isDefault: true,
      },
      {
        streamIndex: 2,
        codec: "eac3",
        profile: null,
        channels: 8,
        channelLayout: "7.1",
        bitrate: 1536,
        language: "eng",
        title: "Eng",
        translationType: null,
        isDefault: false,
      },
    ],
  };

  it("resolves by global index", () => {
    expect(resolveProbeAudioTrack(probe, streams, 2)?.title).toBe("Eng");
  });

  it("resolves by legacy ordinal", () => {
    expect(resolveProbeAudioTrack(probe, streams, 0)?.title).toBe("Rus");
  });

  it("resolves legacy ordinal rows stored in catalog", () => {
    const ordinalProbe = {
      audio: [
        { ...probe.audio[0]!, streamIndex: 0, title: "Dub" },
        { ...probe.audio[1]!, streamIndex: 1, title: "Original" },
      ],
    };
    const multiAudio = [
      { index: 0, codec_type: "video" },
      { index: 1, codec_type: "audio" },
      { index: 2, codec_type: "audio" },
    ] as FfprobeStream[];

    expect(resolveProbeAudioTrack(ordinalProbe, multiAudio, 0)?.title).toBe("Dub");
    expect(resolveProbeAudioTrack(ordinalProbe, multiAudio, 1)?.title).toBe(
      "Original",
    );
  });
});

describe("resolveProbeSubtitleTrack", () => {
  const probe = {
    subtitles: [
      {
        streamIndex: 3,
        codec: "subrip",
        codecLabel: "SRT",
        language: "rus",
        title: "Forced",
        isDefault: false,
        forced: true,
      },
      {
        streamIndex: 4,
        codec: "subrip",
        codecLabel: "SRT",
        language: "rus",
        title: "Full",
        isDefault: true,
        forced: false,
      },
    ],
  };

  it("resolves by legacy ordinal", () => {
    expect(resolveProbeSubtitleTrack(probe, streams, 0)?.title).toBe("Forced");
    expect(resolveProbeSubtitleTrack(probe, streams, 1)?.title).toBe("Full");
  });
});
