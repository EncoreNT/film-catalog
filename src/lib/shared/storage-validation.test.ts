import { describe, expect, it } from "vitest";
import { validateStorageSelection } from "@/lib/shared/storage-validation";

describe("validateStorageSelection", () => {
  it("requires a disk when external storage is selected", () => {
    expect(validateStorageSelection("external", "")).toBe(
      "Выберите внешний диск или создайте новый",
    );
  });

  it("passes for local storage", () => {
    expect(validateStorageSelection("local", "")).toBeNull();
  });

  it("passes for external storage with selected id", () => {
    expect(validateStorageSelection("external", "12")).toBeNull();
  });
});
