import { describe, expect, it } from "vitest";
import { exportReleaseBlockReason } from "@/lib/releases/export-release-ui";

describe("exportReleaseBlockReason", () => {
  it("returns null when export is allowed", () => {
    expect(
      exportReleaseBlockReason({
        hasFilePath: true,
        mediaSaveDirConfigured: true,
      }),
    ).toBeNull();
  });

  it("explains missing file path first", () => {
    expect(
      exportReleaseBlockReason({
        hasFilePath: false,
        mediaSaveDirConfigured: false,
      }),
    ).toContain("путь к файлу");
  });

  it("explains missing media save dir", () => {
    expect(
      exportReleaseBlockReason({
        hasFilePath: true,
        mediaSaveDirConfigured: false,
      }),
    ).toContain("папка сохранения");
  });
});
