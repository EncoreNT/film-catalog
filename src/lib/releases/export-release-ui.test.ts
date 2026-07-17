import { describe, expect, it } from "vitest";
import { exportReleaseBlockReason } from "@/lib/releases/export-release-ui";

describe("exportReleaseBlockReason", () => {
  it("returns null when export is allowed", () => {
    expect(
      exportReleaseBlockReason({
        hasFilePath: true,
      }),
    ).toBeNull();
  });

  it("explains missing file path", () => {
    expect(
      exportReleaseBlockReason({
        hasFilePath: false,
      }),
    ).toContain("путь к файлу");
  });
});
