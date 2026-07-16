import { describe, expect, it } from "vitest";
import { buildFfmpegAudioOrdinalArgs } from "@/lib/builds/build-ffmpeg";

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
});
