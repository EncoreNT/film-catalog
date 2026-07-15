import { describe, expect, it } from "vitest";
import { secondsToHmsParts } from "@/lib/shared/duration-parts";

describe("secondsToHmsParts", () => {
  it("splits whole seconds into h/m/s", () => {
    expect(secondsToHmsParts(3661)).toEqual({ h: 1, m: 1, s: 1 });
  });

  it("rounds fractional seconds before splitting", () => {
    expect(secondsToHmsParts(59.6)).toEqual({ h: 0, m: 1, s: 0 });
  });

  it("handles zero", () => {
    expect(secondsToHmsParts(0)).toEqual({ h: 0, m: 0, s: 0 });
  });
});
