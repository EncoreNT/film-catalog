import { describe, expect, it } from "vitest";
import { normalizePickerStdout } from "@/lib/shared/pick-directory";

describe("normalizePickerStdout", () => {
  it("trims whitespace and CRLF", () => {
    expect(normalizePickerStdout("F:\\Movies\r\n")).toBe("F:\\Movies");
  });

  it("strips UTF-8 BOM", () => {
    expect(normalizePickerStdout("\uFEFFF:\\Фильмы")).toBe("F:\\Фильмы");
  });
});
