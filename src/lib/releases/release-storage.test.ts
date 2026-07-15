import { describe, expect, it } from "vitest";
import {
  LOCAL_STORAGE_LABEL,
  UNKNOWN_EXTERNAL_STORAGE_LABEL,
  externalStorageNameFromRelease,
  releaseHasExternalStorage,
  releaseStorageLabel,
} from "@/lib/releases/release-storage";

describe("releaseStorageLabel", () => {
  it("returns external drive name when linked", () => {
    expect(
      releaseStorageLabel({
        externalStorage: { name: "Seagate 4TB" },
        filePath: "D:\\film.mkv",
      }),
    ).toBe("Seagate 4TB");
  });

  it("returns local label when file exists without external storage", () => {
    expect(
      releaseStorageLabel({
        externalStorage: null,
        filePath: "D:\\film.mkv",
      }),
    ).toBe(LOCAL_STORAGE_LABEL);
  });

  it("returns null when no file and no external storage", () => {
    expect(releaseStorageLabel({ externalStorage: null, filePath: null })).toBe(
      null,
    );
  });
});

describe("releaseHasExternalStorage", () => {
  it("is true when externalStorageId is set", () => {
    expect(releaseHasExternalStorage({ externalStorageId: 1 })).toBe(true);
  });

  it("is false for local releases", () => {
    expect(releaseHasExternalStorage({ externalStorageId: null })).toBe(false);
  });
});

describe("externalStorageNameFromRelease", () => {
  it("returns storage name when linked", () => {
    expect(
      externalStorageNameFromRelease({
        externalStorageId: 1,
        externalStorage: { name: "Seagate 4TB" },
      }),
    ).toBe("Seagate 4TB");
  });

  it("falls back when id is set but relation is missing", () => {
    expect(
      externalStorageNameFromRelease({
        externalStorageId: 1,
        externalStorage: null,
      }),
    ).toBe(UNKNOWN_EXTERNAL_STORAGE_LABEL);
  });

  it("returns null for local releases", () => {
    expect(
      externalStorageNameFromRelease({
        externalStorageId: null,
        externalStorage: null,
      }),
    ).toBeNull();
  });
});
