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
