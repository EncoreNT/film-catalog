import { describe, expect, it } from "vitest";
import {
  bpsToKbps,
  dedupeDefaultAudioTracks,
  normalizeAudioTrackDefaultsInPlace,
  parseDurationSeconds,
  parseTimecodeToSeconds,
  type ProbedAudioTrack,
} from "@/lib/media/ffprobe-parse";

function audioTrack(isDefault: boolean): ProbedAudioTrack {
  return {
    streamIndex: 0,
    codec: "aac",
    profile: null,
    channels: 2,
    channelLayout: "stereo",
    bitrate: null,
    language: "rus",
    title: null,
    translationType: null,
    isDefault,
  };
}

describe("normalizeAudioTrackDefaultsInPlace", () => {
  it("marks the only audio track as default", () => {
    const tracks = [audioTrack(false)];
    normalizeAudioTrackDefaultsInPlace(tracks);
    expect(tracks[0]?.isDefault).toBe(true);
  });

  it("keeps a single default when several tracks are flagged", () => {
    const tracks = [audioTrack(true), { ...audioTrack(false), streamIndex: 1, isDefault: true }];
    dedupeDefaultAudioTracks(tracks);
    expect(tracks[0]?.isDefault).toBe(true);
    expect(tracks[1]?.isDefault).toBe(false);
  });
});

describe("bpsToKbps", () => {
  it("converts bits per second to kbps", () => {
    expect(bpsToKbps("8000000")).toBe(8000);
    expect(bpsToKbps(null)).toBeNull();
  });
});

describe("parseDurationSeconds", () => {
  it("parses ffprobe format duration", () => {
    expect(parseDurationSeconds({ duration: "3723.040000" })).toBe(3723);
    expect(parseDurationSeconds(undefined)).toBeNull();
  });
});

describe("parseTimecodeToSeconds", () => {
  it("parses HH:MM:SS.mmm timecodes", () => {
    expect(parseTimecodeToSeconds("01:02:03.500")).toBe(3723.5);
  });
});
