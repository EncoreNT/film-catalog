import { describe, expect, it } from "vitest";
import {
  LOCAL_STORAGE_LABEL,
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
