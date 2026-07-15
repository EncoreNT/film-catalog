import { describe, expect, it } from "vitest";
import {
  releaseToTabTier,
  resolveSpotlightTier,
  slotToTileTone,
  tierCardGlow,
  tierChipTone,
  tierLaserTopClass,
  tierPosterGlow,
  tierTabStyles,
  SLOT_TIER_CELL,
} from "@/lib/media/tier-presentation";

describe("tier-presentation", () => {
  it("maps card glow by tier", () => {
    expect(tierCardGlow("ruby")).toBe("glow-card-ruby");
    expect(tierCardGlow("gold")).toBe("glow-card-gold");
    expect(tierCardGlow(null)).toBe("glow-card-rest");
  });

  it("maps poster glow variants", () => {
    expect(tierPosterGlow("ruby", "inset")).toBe("glow-poster-ruby-inset");
    expect(tierPosterGlow("gold", "rest")).toBe("glow-poster-gold-rest");
    expect(tierPosterGlow(null, "inset")).toBe("glow-poster-inset");
  });

  it("maps chip tone", () => {
    expect(tierChipTone("ruby")).toBe("ruby");
    expect(tierChipTone("gold")).toBe("gold");
    expect(tierChipTone(null)).toBe("default");
  });

  it("resolves spotlight tier priority", () => {
    expect(resolveSpotlightTier(["standard", "gold"])).toBe("gold");
    expect(resolveSpotlightTier(["standard", "ruby", "gold"])).toBe("ruby");
    expect(resolveSpotlightTier(["standard", "missing"])).toBe("standard");
    expect(resolveSpotlightTier([null, "missing"])).toBe("general");
  });

  it("maps release tier to tab tier", () => {
    expect(releaseToTabTier("ruby")).toBe("ruby");
    expect(releaseToTabTier("gold")).toBe("gold");
    expect(releaseToTabTier("standard")).toBe("none");
    expect(releaseToTabTier(null)).toBe("none");
  });

  it("exposes slot reel class maps for every slot tier", () => {
    expect(SLOT_TIER_CELL.ruby).toContain("crimson");
    expect(SLOT_TIER_CELL.missing).toContain("ember");
    expect(slotToTileTone("gold")).toBe("gold");
    expect(slotToTileTone("missing")).toBe("normal");
  });

  it("maps laser top classes", () => {
    expect(tierLaserTopClass("ruby")).toContain("tier-laser-top-ruby");
    expect(tierLaserTopClass("ember")).toContain("tier-laser-top-ember");
  });

  it("returns tab styles with tier tags", () => {
    expect(tierTabStyles("ruby").tag).toBe("RUBY");
    expect(tierTabStyles("gold").text).toContain("accent");
    expect(tierTabStyles("none").tag).toBe("");
  });
});
