import { describe, expect, it } from "vitest";
import {
  probeToAudioRows,
  probeToSubtitleRows,
  probeToVideoFields,
} from "@/lib/media/apply-probe";
import type { ProbeResult } from "@/lib/media/ffprobe";

describe("probeToVideoFields", () => {
  it("returns empty object when video is null", () => {
    expect(probeToVideoFields(null)).toEqual({});
  });

  it("maps probe video fields with SDR default for missing hdr", () => {
    const video: NonNullable<ProbeResult["video"]> = {
      streamIndex: 0,
      width: 1920,
      height: 1080,
      resolutionLabel: "1080p",
      codec: "h264",
      hdr: null,
      fps: "23.976",
      bitrate: 8000000,
    };
    expect(probeToVideoFields(video)).toEqual({
      codec: "h264",
      hdr: "SDR",
      resolutionLabel: "1080p",
      width: 1920,
      height: 1080,
      fps: "23.976",
      bitrate: 8000000,
    });
  });
});

describe("probeToAudioRows", () => {
  it("normalizes profile and assigns row keys", () => {
    const rows = probeToAudioRows([
      {
        streamIndex: 1,
        codec: "truehd",
        profile: "None",
        channels: 8,
        channelLayout: "7.1",
        language: "rus",
        translationType: "dub",
        bitrate: 3000000,
        title: "Dub",
        isDefault: true,
      },
    ]);
    expect(rows).toHaveLength(1);
    expect(rows[0].profile).toBe("None");
    expect(rows[0].channelLayout).toBe("7.1");
    expect(rows[0].language).toBe("rus");
    expect(rows[0].translationType).toBe("dub");
    expect(rows[0].rowKey).toMatch(/^audio-/);
  });
});

describe("probeToSubtitleRows", () => {
  it("maps subtitle tracks with defaults", () => {
    const rows = probeToSubtitleRows([
      {
        streamIndex: 2,
        codec: "subrip",
        codecLabel: null,
        language: "eng",
        title: null,
        isDefault: false,
        forced: true,
      },
    ]);
    expect(rows[0]).toMatchObject({
      codecLabel: "SRT",
      language: "eng",
      forced: true,
      isDefault: false,
    });
  });
});
