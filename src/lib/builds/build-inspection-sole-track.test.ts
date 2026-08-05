import { describe, expect, it } from "vitest";
import { resolveSoleMkvTrackId } from "@/lib/builds/build-inspection";

describe("resolveSoleMkvTrackId", () => {
  it("returns the only audio track id (ffmpeg mka uses 0)", () => {
    expect(
      resolveSoleMkvTrackId([{ id: 0, type: "audio", codec: "ac3" }], "audio"),
    ).toBe(0);
  });

  it("returns null when multiple tracks of the same kind exist", () => {
    expect(
      resolveSoleMkvTrackId(
        [
          { id: 1, type: "audio", codec: "ac3" },
          { id: 2, type: "audio", codec: "ac3" },
        ],
        "audio",
      ),
    ).toBeNull();
  });
});
