import { describe, expect, it } from "vitest";
import {
  buildPartPath,
  ffprobeOrdinalAmongType,
  normalizeOutputPath,
  parseMkvIdentifyJson,
  resolveMkvTrackIdByOrdinal,
} from "@/lib/builds/build-inspection";

describe("build-inspection", () => {
  it("parses mkvmerge identify json", () => {
    const parsed = parseMkvIdentifyJson(
      JSON.stringify({
        container: { properties: { duration: 7_200_000_000_000 } },
        tracks: [
          { id: 1, type: "video", codec: "V_MPEGH/ISO/HEVC" },
          { id: 2, type: "audio", codec: "A_DTS" },
        ],
      }),
    );
    expect(parsed.container.duration).toBe(7200);
    expect(parsed.tracks).toHaveLength(2);
  });

  it("resolves mkv track id by ordinal", () => {
    const tracks = parseMkvIdentifyJson(
      JSON.stringify({
        tracks: [
          { id: 0, type: "video" },
          { id: 2, type: "audio" },
          { id: 3, type: "audio" },
        ],
      }),
    ).tracks;
    expect(resolveMkvTrackIdByOrdinal(tracks, "audio", 1)).toBe(3);
  });

  it("computes ffprobe ordinal among type", () => {
    const streams = [
      { index: 0, codec_type: "video" },
      { index: 1, codec_type: "audio" },
      { index: 2, codec_type: "audio" },
    ];
    expect(ffprobeOrdinalAmongType(streams, 2, "audio")).toBe(1);
  });

  it("normalizes output path", () => {
    expect(normalizeOutputPath("/tmp/out.mkv")).toBe("/tmp/out.mkv");
    expect(() => normalizeOutputPath("relative.mkv")).toThrow(
      "абсолютным",
    );
  });

  it("builds part path", () => {
    expect(buildPartPath("/tmp/film.mkv", 9)).toBe("/tmp/.film.9.part.mkv");
  });
});
