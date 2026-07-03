import { describe, expect, it } from "vitest";
import { trimInput, trimMultiline } from "@/lib/shared/text-trim";

describe("trimMultiline", () => {
  it("removes blank lines at the edges", () => {
    expect(trimMultiline("\n\nhello\nworld\n\n")).toBe("hello\nworld");
    expect(trimMultiline("   \n  \n")).toBe("");
  });

  it("preserves internal blank lines", () => {
    expect(trimMultiline("a\n\nb")).toBe("a\n\nb");
  });
});

describe("trimInput", () => {
  it("trims horizontal whitespace", () => {
    expect(trimInput("  dub  ")).toBe("dub");
  });
});
