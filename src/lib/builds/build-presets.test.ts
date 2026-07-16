import { describe, expect, it } from "vitest";
import {
  bitratePresetsForCodec,
  channelTargetLabel,
  channelTargetToLayout,
  isValidBitrate,
} from "@/lib/builds/build-presets";

describe("build-presets", () => {
  it("returns codec-specific bitrates", () => {
    expect(bitratePresetsForCodec("ac3")).toContain(448);
    expect(bitratePresetsForCodec("eac3")).toContain(768);
  });

  it("validates bitrate membership", () => {
    expect(isValidBitrate("eac3", 768)).toBe(true);
    expect(isValidBitrate("ac3", 768)).toBe(false);
  });

  it("maps channel targets", () => {
    expect(channelTargetToLayout("stereo")).toBe("stereo");
    expect(channelTargetLabel("up_to_51")).toBe("до 5.1");
  });
});
