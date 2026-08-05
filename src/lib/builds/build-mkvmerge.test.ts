import { describe, expect, it } from "vitest";
import {
  buildMkvmergeArgs,
  buildMkvmergeOutputPlan,
  formatMkvmergeTrackNameArg,
} from "@/lib/builds/build-mkvmerge";

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

  it("applies track order and per-input default flags", () => {
    const plan = buildMkvmergeOutputPlan([
      {
        sortOrder: 0,
        kind: "video",
        syncFileIndex: 0,
        mkvTrackId: 1,
        isDefault: false,
      },
      {
        sortOrder: 1,
        kind: "audio",
        syncFileIndex: 1,
        mkvTrackId: 1,
        isDefault: true,
      },
      {
        sortOrder: 2,
        kind: "audio",
        syncFileIndex: 0,
        mkvTrackId: 3,
        isDefault: false,
      },
    ]);

    const args = buildMkvmergeArgs({
      outputPath: "/out.mkv",
      inputs: [
        {
          filePath: "/main.mkv",
          videoTrackIds: [1],
          audioTrackIds: [3],
          defaultTrackFlags: plan.defaultFlagsByFileIndex.get(0),
        },
        {
          filePath: "/temp.mka",
          audioTrackIds: [1],
          defaultTrackFlags: plan.defaultFlagsByFileIndex.get(1),
        },
      ],
      trackOrder: plan.trackOrder,
    });

    expect(args).toContain("--track-order");
    expect(args).toContain("0:1,1:1,0:3");
    expect(args).toContain("--default-track-flag");
    expect(args).toContain("3:0");
    expect(args).toContain("1");
  });

  it("applies per-track sync delay before each input path", () => {
    const args = buildMkvmergeArgs({
      outputPath: "/out.mkv",
      inputs: [
        {
          filePath: "/main.mkv",
          videoTrackIds: [1],
          audioTrackIds: [4],
          trackSync: [{ trackId: 4, offsetMs: -3450 }],
        },
      ],
    });

    const syncIndex = args.indexOf("--sync");
    expect(syncIndex).toBeGreaterThan(-1);
    expect(args[syncIndex + 1]).toBe("4:-3450");
    expect(args[syncIndex + 2]).toBe("/main.mkv");
  });

  it("applies track names before each input path", () => {
    const args = buildMkvmergeArgs({
      outputPath: "/out.mkv",
      inputs: [
        {
          filePath: "/main.mkv",
          audioTrackIds: [2],
          trackNames: [{ trackId: 2, name: "MVO | Pazl Voice" }],
        },
      ],
    });

    const nameIndex = args.indexOf("--track-name");
    expect(nameIndex).toBeGreaterThan(-1);
    expect(args[nameIndex + 1]).toBe("2:MVO | Pazl Voice");
  });

  it("strips source track tags when custom names are set", () => {
    const args = buildMkvmergeArgs({
      outputPath: "/out.mkv",
      inputs: [
        {
          filePath: "/main.mkv",
          audioTrackIds: [2],
          trackNames: [{ trackId: 2, name: "Custom" }],
          noTrackTags: true,
        },
      ],
    });
    expect(args).toContain("--no-track-tags");
  });

  it("preserves colons inside track title", () => {
    expect(formatMkvmergeTrackNameArg(3, "Dub: Blu-Ray")).toBe("3:Dub: Blu-Ray");
  });
});
