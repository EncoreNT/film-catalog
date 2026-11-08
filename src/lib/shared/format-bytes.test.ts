import { describe, expect, it } from "vitest";
import {
  formatArchiveTotalSize,
  formatBytes,
  formatFileSizeGB,
} from "@/lib/shared/format-bytes";

describe("formatBytes", () => {
  it("labels binary disk capacity explicitly and distinguishes zero from unknown", () => {
    expect(formatBytes(2_000_000_000_000, { unit: "binary" })).toBe("1,82 ТиБ");
    expect(formatBytes(500_000_000_000, { unit: "binary" })).toBe("465,66 ГиБ");
    expect(formatBytes(0, { unit: "binary" })).toBe("0 Б");
    expect(formatBytes(null, { unit: "binary" })).toBeNull();
  });
  it("formats gb mode with 2 decimals", () => {
    expect(formatBytes(2 * 1024 ** 3, { unit: "gb" })).toBe("2.00 ГБ");
    expect(formatFileSizeGB(2 * 1024 ** 3)).toBe("2.00 ГБ");
  });

  it("formats short mode", () => {
    expect(formatBytes(512 * 1024 ** 2, { unit: "short" })).toBe("512 МБ");
    expect(formatBytes(1.5 * 1024 ** 3, { unit: "short" })).toBe("1.5 ГБ");
  });

  it("formats archive totals", () => {
    expect(formatArchiveTotalSize(150 * 1024 ** 3)).toBe("150 ГБ");
    expect(formatArchiveTotalSize(5.4 * 1024 ** 4)).toBe("5.4 ТБ");
  });

  it("returns null for empty input", () => {
    expect(formatBytes(null)).toBeNull();
    expect(formatBytes(0)).toBeNull();
  });
});
