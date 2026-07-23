import { describe, expect, it } from "vitest";
import {
  hdrShortLabel,
  isPremiumOriginalSpatialTrack,
  isPremiumRussianAtmosTrack,
  isSpatialAudioProfile,
  nullifyAudioProfile,
} from "@/lib/media/quality-predicates";

describe("quality-predicates", () => {
  it("isSpatialAudioProfile", () => {
    expect(isSpatialAudioProfile("Atmos")).toBe(true);
    expect(isSpatialAudioProfile("DTS:X MA")).toBe(true);
    expect(isSpatialAudioProfile("None")).toBe(false);
    expect(isSpatialAudioProfile("HD MA")).toBe(false);
  });

  it("isPremiumRussianAtmosTrack", () => {
    expect(
      isPremiumRussianAtmosTrack({
        profile: "Atmos",
        language: "rus",
        isDefault: true,
      }),
    ).toBe(true);
    expect(
      isPremiumRussianAtmosTrack({
        profile: "Atmos",
        language: "eng",
        isDefault: true,
      }),
    ).toBe(false);
  });

  it("isPremiumOriginalSpatialTrack", () => {
    expect(
      isPremiumOriginalSpatialTrack({
        profile: "Atmos",
        translationType: "original",
      }),
    ).toBe(true);
    expect(
      isPremiumOriginalSpatialTrack({
        profile: "Atmos",
        translationType: "dub",
        isDefault: false,
      }),
    ).toBe(false);
  });

  it("nullifyAudioProfile", () => {
    expect(nullifyAudioProfile("None")).toBeNull();
    expect(nullifyAudioProfile("Atmos")).toBe("Atmos");
  });

  it("hdrShortLabel", () => {
    expect(hdrShortLabel(null)).toBe("SDR");
    expect(hdrShortLabel("HDR10")).toBe("HDR10");
    expect(hdrShortLabel("DV:Profile7")).toBe("DV");
  });
});
