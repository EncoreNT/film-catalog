import { describe, expect, it } from "vitest";
import {
  buildTracksRequireTranscode,
  recipeRequiresTranscode,
} from "@/lib/builds/build-requires-transcode";

describe("recipeRequiresTranscode", () => {
  it("returns false for copy-only mux", () => {
    expect(
      recipeRequiresTranscode([
        { kind: "video" },
        { kind: "audio", audioMode: "copy" },
        { kind: "subtitle" },
      ]),
    ).toBe(false);
  });

  it("returns true when any audio track transcodes", () => {
    expect(
      recipeRequiresTranscode([
        { kind: "video" },
        { kind: "audio", audioMode: "transcode" },
        { kind: "audio", audioMode: "copy" },
      ]),
    ).toBe(true);
  });

  it("accepts prisma enum casing", () => {
    expect(
      buildTracksRequireTranscode([
        { kind: "VIDEO" },
        { kind: "AUDIO", audioMode: "TRANSCODE" },
      ]),
    ).toBe(true);
  });
});
