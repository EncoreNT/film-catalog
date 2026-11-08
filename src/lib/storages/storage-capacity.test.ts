import { describe, expect, it } from "vitest";
import {
  capacityDraft,
  capacityValue,
  parseCapacityBytes,
  storageUsagePercent,
} from "./storage-capacity";
import {
  externalStorageCreateSchema,
  externalStorageUpdateSchema,
} from "@/lib/api/validators/scan";

describe("disk capacity", () => {
  it("uses manufacturer decimal units and accepts a Russian decimal separator", () => {
    expect(parseCapacityBytes("2", "tb")).toBe(2_000_000_000_000);
    expect(parseCapacityBytes("2000", "gb")).toBe(2_000_000_000_000);
    expect(parseCapacityBytes(" 0,5 ", "tb")).toBe(500_000_000_000);
    expect(capacityDraft(500_000_000_000)).toEqual({
      value: "500",
      unit: "gb",
    });
    expect(capacityDraft(2_000_000_000_000)).toEqual({
      value: "2",
      unit: "tb",
    });
    expect(capacityValue(parseCapacityBytes("2", "tb"), "gb")).toBe("2000");
  });

  it("preserves unknown capacity and rejects invalid or unsafe sizes", () => {
    expect(parseCapacityBytes(" ", "tb")).toBeNull();
    expect(capacityDraft(null)).toEqual({ value: "", unit: "tb" });
    for (const value of [
      "0",
      "-2",
      "a",
      "Infinity",
      "1,2,3",
      "10000000",
      "1e2",
    ]) {
      expect(parseCapacityBytes(value, "tb")).toBeNaN();
    }
  });

  it("compares raw bytes without a 1000/1024 correction and preserves overflow", () => {
    expect(storageUsagePercent(1_000_000_000_000, 2_000_000_000_000)).toBe(50);
    expect(storageUsagePercent(0, 2_000_000_000_000)).toBe(0);
    expect(storageUsagePercent(3_000_000_000_000, 2_000_000_000_000)).toBe(150);
    expect(storageUsagePercent(100, null)).toBeNull();
    expect(storageUsagePercent(100, 0)).toBeNull();
  });

  it("validates persisted byte counts, allows clearing and keeps old create clients compatible", () => {
    expect(
      externalStorageCreateSchema.safeParse({ name: "Disk" }).success,
    ).toBe(true);
    for (const capacityBytes of [null, 2_000_000_000_000, 500_000_000_000]) {
      expect(
        externalStorageUpdateSchema.safeParse({ capacityBytes }).success,
      ).toBe(true);
    }
    for (const capacityBytes of [
      undefined,
      0,
      -1,
      1.5,
      "2",
      Number.MAX_SAFE_INTEGER + 1,
    ]) {
      expect(
        externalStorageUpdateSchema.safeParse({ capacityBytes }).success,
      ).toBe(false);
    }
  });
});
