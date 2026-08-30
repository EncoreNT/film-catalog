import { describe, expect, it } from "vitest";
import { bdmvInspectTrackLabel } from "@/lib/media/bdmv/bdmv-track-label";

describe("bdmvInspectTrackLabel", () => {
  it("keeps a real track name from identify", () => {
    expect(
      bdmvInspectTrackLabel({
        type: "audio",
        codec: "A_AC3",
        language: "eng",
        name: "Commentary",
        channels: 2,
      }),
    ).toContain("Commentary");
  });

  it("does not treat the language code as a title", () => {
    expect(
      bdmvInspectTrackLabel({
        type: "audio",
        codec: "A_TRUEHD",
        language: "eng",
        name: "eng",
        channels: 8,
      }),
    ).toBe("Английский · TrueHD Atmos · 7.1");
  });

  it("composes language, codec and layout when the disc has no title", () => {
    expect(
      bdmvInspectTrackLabel({
        type: "audio",
        codec: "A_TRUEHD",
        language: "rus",
        name: null,
        channels: 8,
      }),
    ).toBe("Русский · TrueHD Atmos · 7.1");
  });

  it("promotes DTS-HD Master Audio from the mkvmerge codec string", () => {
    expect(
      bdmvInspectTrackLabel({
        type: "audio",
        codec: "DTS-HD Master Audio",
        language: "rus",
        name: null,
        channels: 6,
      }),
    ).toBe("Русский · DTS-HD MA · 5.1");
  });

  it("labels PGS subtitles by language", () => {
    expect(
      bdmvInspectTrackLabel({
        type: "subtitle",
        codec: "S_HDMV/PGS",
        language: "rus",
        name: null,
        channels: null,
      }),
    ).toBe("Русский · PGS");
  });
});
