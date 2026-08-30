import { describe, expect, it } from "vitest";
import { bdmvTracksToMkvmergePlan } from "@/lib/builds/bdmv-mux";
import { buildMkvmergeArgs } from "@/lib/builds/build-mkvmerge";

describe("bdmvTracksToMkvmergePlan", () => {
  it("filters selected audio ids and does not emit --no-video", () => {
    const plan = bdmvTracksToMkvmergePlan("/out.mkv", "/disc/BDMV/PLAYLIST/00000.mpls", [
      { sortOrder: 0, kind: "video", mkvTrackId: 0, isDefault: true },
      { sortOrder: 1, kind: "audio", mkvTrackId: 2, isDefault: true, name: "English" },
      { sortOrder: 2, kind: "audio", mkvTrackId: 3, isDefault: false },
    ]);
    const args = buildMkvmergeArgs(plan);
    expect(args).toContain("--video-tracks");
    expect(args).toContain("0");
    expect(args).toContain("--audio-tracks");
    expect(args).toContain("2,3");
    expect(args).not.toContain("--no-video");
    expect(args).toContain("--no-subtitles");
    expect(args).toContain("/disc/BDMV/PLAYLIST/00000.mpls");
    expect(args).toContain("--track-order");
  });

  it("omits unselected video ids", () => {
    const plan = bdmvTracksToMkvmergePlan("/out.mkv", "/p.mpls", [
      { sortOrder: 0, kind: "video", mkvTrackId: 1, isDefault: true },
    ]);
    const args = buildMkvmergeArgs(plan);
    expect(args).toEqual(
      expect.arrayContaining(["--video-tracks", "1", "--no-audio", "--no-subtitles"]),
    );
  });

  it("sets forced-display-flag for selected and cleared tracks", () => {
    const plan = bdmvTracksToMkvmergePlan("/out.mkv", "/p.mpls", [
      { sortOrder: 0, kind: "video", mkvTrackId: 0, isDefault: true },
      { sortOrder: 1, kind: "subtitle", mkvTrackId: 3, isDefault: false, forced: true },
      { sortOrder: 2, kind: "subtitle", mkvTrackId: 4, isDefault: false, forced: false },
    ]);
    const args = buildMkvmergeArgs(plan);
    const flags: string[] = [];
    for (let i = 0; i < args.length; i += 1) {
      if (args[i] === "--forced-display-flag") flags.push(args[i + 1] ?? "");
    }
    expect(flags).toEqual(["0:0", "3", "4:0"]);
  });
});
