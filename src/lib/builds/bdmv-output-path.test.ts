import { describe, expect, it } from "vitest";
import { suggestBdmvOutputPath } from "@/lib/builds/bdmv-output-path";

describe("suggestBdmvOutputPath", () => {
  it("places the MKV next to the BDMV parent folder", () => {
    expect(
      suggestBdmvOutputPath({
        movieTitle: "The Foreigner",
        movieYear: 2017,
        bdmvRoot: "/mnt/d/Films/Foreigner Remux/BDMV",
      }),
    ).toBe("/mnt/d/Films/Foreigner Remux/The Foreigner (2017) BDRemux.mkv");
  });

  it("omits the year when it is missing", () => {
    expect(
      suggestBdmvOutputPath({
        movieTitle: "Untitled",
        movieYear: null,
        bdmvRoot: "/mnt/d/Films/Untitled/BDMV",
      }),
    ).toBe("/mnt/d/Films/Untitled/Untitled BDRemux.mkv");
  });
});
