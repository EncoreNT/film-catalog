import { describe, expect, it } from "vitest";
import { moveReleaseBlockReason } from "@/lib/releases/move-release-ui";

describe("moveReleaseBlockReason", () => {
  it("requires file path", () => {
    expect(
      moveReleaseBlockReason({
        hasFilePath: false,
        activeJob: false,
        activeExport: false,
        activeBuild: false,
      }),
    ).toBe("Не указан путь к файлу релиза");
  });

  it("blocks when move is active", () => {
    expect(
      moveReleaseBlockReason({
        hasFilePath: true,
        activeJob: true,
        activeExport: false,
        activeBuild: false,
      }),
    ).toBe("Перемещение уже выполняется");
  });

  it("passes when ready", () => {
    expect(
      moveReleaseBlockReason({
        hasFilePath: true,
        activeJob: false,
        activeExport: false,
        activeBuild: false,
      }),
    ).toBeNull();
  });
});
