import { describe, expect, it } from "vitest";
import { copyProgressPercent } from "@/lib/shared/copy-with-progress";

describe("copyProgressPercent", () => {
  it("returns 0 for empty total", () => {
    expect(copyProgressPercent({ bytesCopied: 100, totalBytes: 0 })).toBe(0);
  });

  it("rounds to one decimal", () => {
    expect(
      copyProgressPercent({ bytesCopied: 512, totalBytes: 1000 }),
    ).toBe(51.2);
  });

  it("caps at 100", () => {
    expect(
      copyProgressPercent({ bytesCopied: 2000, totalBytes: 1000 }),
    ).toBe(100);
  });
});
