import { describe, expect, it } from "vitest";
import {
  formatArchiveTotalDuration,
  formatArchiveTotalSize,
} from "@/lib/shared/format";

describe("formatArchiveTotalDuration", () => {
  it("formats hours and minutes", () => {
    expect(formatArchiveTotalDuration(10_800)).toBe("3 ч 0 мин");
  });

  it("formats multi-day totals", () => {
    expect(formatArchiveTotalDuration(400_000)).toBe("4 д 15 ч");
  });
});

describe("formatArchiveTotalSize", () => {
  it("formats gibibytes", () => {
    expect(formatArchiveTotalSize(150 * 1024 ** 3)).toBe("150 ГБ");
  });

  it("formats tebibytes", () => {
    expect(formatArchiveTotalSize(5.4 * 1024 ** 4)).toBe("5.4 ТБ");
  });
});
