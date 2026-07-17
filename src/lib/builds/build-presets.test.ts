import { describe, expect, it } from "vitest";
import {
  bitratePresetsForCodec,
  channelTargetLabel,
  channelTargetToLayout,
  defaultChannelTarget,
  effectiveChannelCount,
  defaultTranscodeBitrate,
  idealTranscodeBitrate,
  isAc3FamilyCodec,
  isHigherThanAc3Codec,
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
    expect(channelTargetLabel("up_to_51")).toBe("5.1");
  });

  describe("effectiveChannelCount", () => {
    it("uses channels when set", () => {
      expect(effectiveChannelCount(8, "7.1")).toBe(8);
    });

    it("parses layout when channels missing", () => {
      expect(effectiveChannelCount(null, "7.1")).toBe(8);
      expect(effectiveChannelCount(null, "5.1")).toBe(6);
    });

    it("returns 0 when unknown", () => {
      expect(effectiveChannelCount(null, null)).toBe(0);
      expect(effectiveChannelCount(null, "other")).toBe(0);
    });
  });

  describe("codec classification", () => {
    it("recognizes AC-3 family", () => {
      expect(isAc3FamilyCodec("ac3")).toBe(true);
      expect(isAc3FamilyCodec("EAC3")).toBe(true);
      expect(isAc3FamilyCodec("dts")).toBe(false);
      expect(isAc3FamilyCodec(null)).toBe(false);
    });

    it("recognizes codecs higher than AC-3", () => {
      expect(isHigherThanAc3Codec("dts")).toBe(true);
      expect(isHigherThanAc3Codec("truehd")).toBe(true);
      expect(isHigherThanAc3Codec("mlp")).toBe(true);
      expect(isHigherThanAc3Codec("flac")).toBe(true);
      expect(isHigherThanAc3Codec("ac3")).toBe(false);
      expect(isHigherThanAc3Codec("eac3")).toBe(false);
      expect(isHigherThanAc3Codec(undefined)).toBe(false);
    });
  });

  describe("idealTranscodeBitrate", () => {
    it("returns 448 for AC-3 and 768 for E-AC3", () => {
      expect(idealTranscodeBitrate("ac3")).toBe(448);
      expect(idealTranscodeBitrate("eac3")).toBe(768);
    });
  });

  describe("defaultTranscodeBitrate", () => {
    it("returns ideal when source bitrate unknown", () => {
      expect(defaultTranscodeBitrate("eac3", null)).toBe(768);
      expect(defaultTranscodeBitrate("ac3", undefined)).toBe(448);
    });

    it("clamps to source bitrate without upscale", () => {
      // Источник 448 kbps → E-AC3 ideal 768, clamp до 448
      expect(defaultTranscodeBitrate("eac3", 448)).toBe(448);
      // Источник 1500 kbps → выше ideal 768, остаётся 768
      expect(defaultTranscodeBitrate("eac3", 1500)).toBe(768);
    });

    it("rounds down to nearest valid preset", () => {
      // Источник 500 kbps → ближайший меньший пресет E-AC3 это 448
      expect(defaultTranscodeBitrate("eac3", 500)).toBe(448);
      // Источник 700 kbps → 640
      expect(defaultTranscodeBitrate("eac3", 700)).toBe(640);
      // Источник 300 kbps для AC-3 → 256
      expect(defaultTranscodeBitrate("ac3", 300)).toBe(256);
    });

    it("falls back to lowest preset when source below all presets", () => {
      expect(defaultTranscodeBitrate("eac3", 64)).toBe(128);
    });
  });

  describe("defaultChannelTarget", () => {
    it("returns stereo for mono/stereo sources", () => {
      expect(defaultChannelTarget(1)).toBe("stereo");
      expect(defaultChannelTarget(2)).toBe("stereo");
      expect(defaultChannelTarget(null, "2.0")).toBe("stereo");
    });

    it("returns 5.1 for surround sources", () => {
      expect(defaultChannelTarget(6)).toBe("up_to_51");
      expect(defaultChannelTarget(8)).toBe("up_to_51");
    });

    it("infers surround from layout when channels missing", () => {
      expect(defaultChannelTarget(null, "7.1")).toBe("up_to_51");
      expect(defaultChannelTarget(null, "5.1")).toBe("up_to_51");
    });

    it("falls back to stereo when layout unknown", () => {
      expect(defaultChannelTarget(null)).toBe("stereo");
      expect(defaultChannelTarget(null, null)).toBe("stereo");
    });
  });
});
