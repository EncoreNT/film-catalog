import { describe, expect, it } from "vitest";
import { buildFfmpegAudioOrdinalArgs, parseFfmpegProgressLine, parseFfmpegSpeed } from "@/lib/builds/build-ffmpeg";

describe("build-ffmpeg", () => {
  it("builds transcode args with downmix target", () => {
    const args = buildFfmpegAudioOrdinalArgs(
      {
        inputPath: "/in.mkv",
        streamIndex: 1,
        outputPath: "/tmp/out.mka",
        codec: "eac3",
        bitrateKbps: 768,
        channelTarget: "up_to_51",
        offsetMs: 250,
      },
      0,
    );
    expect(args).toContain("-c:a");
    expect(args).toContain("eac3");
    expect(args).toContain("768k");
    expect(args).toContain("-ac");
    expect(args).toContain("6");
    expect(args).toContain("-itsoffset");
    expect(args).toContain("0.25");
  });

  it("applies atempo when tempoRatio is set", () => {
    const args = buildFfmpegAudioOrdinalArgs(
      {
        inputPath: "/in.mkv",
        streamIndex: 1,
        outputPath: "/tmp/out.mka",
        codec: "eac3",
        bitrateKbps: 768,
        channelTarget: "stereo",
        offsetMs: 0,
        tempoRatio: 1.003,
      },
      0,
    );
    expect(args).toContain("-af");
    expect(args.some((a) => String(a).includes("atempo"))).toBe(true);
  });

  it("embeds track title in transcoded output metadata", () => {
    const args = buildFfmpegAudioOrdinalArgs(
      {
        inputPath: "/in.mkv",
        streamIndex: 1,
        outputPath: "/tmp/out.mka",
        codec: "eac3",
        bitrateKbps: 768,
        channelTarget: "up_to_51",
        offsetMs: 0,
        trackTitle: "English Original",
      },
      0,
    );
    expect(args).toContain("-metadata:s:a:0");
    expect(args).toContain("title=English Original");
  });

  it("parses ffmpeg speed values", () => {
    expect(parseFfmpegSpeed("1.05x")).toBe(1.05);
    expect(parseFfmpegSpeed("N/A")).toBeNull();
  });

  it("converts ffmpeg out_time_ms from microseconds to milliseconds", () => {
    expect(parseFfmpegProgressLine("out_time_ms=3600000000")).toEqual({
      outTimeMs: 3_600_000,
    });
  });
});
