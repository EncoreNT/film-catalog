import { describe, expect, it } from "vitest";
import { assertBdmvTracksMatchIdentify } from "@/lib/builds/bdmv-queue";
import type { BdmvInspectSelected } from "@/lib/media/bdmv/bdmv-inspect";

const selected: BdmvInspectSelected = {
  path: "/p.mpls",
  durationSeconds: 100,
  tracks: {
    video: [
      {
        id: 0,
        type: "video",
        codec: "V_MPEGH/ISO/HEVC",
        language: null,
        name: null,
        defaultTrack: true,
        forcedTrack: false,
        channels: null,
      },
    ],
    audio: [
      {
        id: 2,
        type: "audio",
        codec: "A_TRUEHD",
        language: "eng",
        name: null,
        defaultTrack: true,
        forcedTrack: false,
        channels: 8,
      },
    ],
    subtitles: [],
  },
};

describe("assertBdmvTracksMatchIdentify", () => {
  it("accepts known ids", () => {
    expect(() =>
      assertBdmvTracksMatchIdentify(
        [
          { kind: "video", sourceStreamIndex: 0 },
          { kind: "audio", sourceStreamIndex: 2 },
        ],
        selected,
      ),
    ).not.toThrow();
  });

  it("rejects unknown mkv ids", () => {
    expect(() =>
      assertBdmvTracksMatchIdentify(
        [
          { kind: "video", sourceStreamIndex: 0 },
          { kind: "audio", sourceStreamIndex: 9 },
        ],
        selected,
      ),
    ).toThrow(/Неизвестная дорожка/);
  });

  it("rejects a composition without video", () => {
    expect(() =>
      assertBdmvTracksMatchIdentify(
        [{ kind: "audio", sourceStreamIndex: 2 }],
        selected,
      ),
    ).toThrow(/видеодорожка/);
  });
});
