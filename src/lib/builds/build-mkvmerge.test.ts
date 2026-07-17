import { describe, expect, it } from "vitest";
import { buildMkvmergeArgs } from "@/lib/builds/build-mkvmerge";

describe("build-mkvmerge", () => {
  it("builds multi-input remux command", () => {
    const args = buildMkvmergeArgs({
      outputPath: "/out.mkv",
      inputs: [
        {
          filePath: "/video.mkv",
          videoTrackIds: [0],
          audioTrackIds: [1],
        },
        {
          filePath: "/audio.mkv",
          audioTrackIds: [2],
          noChapters: true,
          noAttachments: true,
        },
      ],
    });
    expect(args[0]).toBe("-o");
    expect(args).toContain("/out.mkv");
    expect(args).toContain("--video-tracks");
    expect(args).toContain("--no-video");
    expect(args).toContain("/video.mkv");
    expect(args).toContain("/audio.mkv");
  });
});
