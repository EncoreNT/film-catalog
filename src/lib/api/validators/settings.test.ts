import { describe, expect, it } from "vitest";
import { settingsPatchSchema } from "./settings";

describe("settingsPatchSchema", () => {
  it("accepts scanRoot only", () => {
    const result = settingsPatchSchema.safeParse({ scanRoot: "/movies" });
    expect(result.success).toBe(true);
  });

  it("accepts mediaSaveDir only", () => {
    const result = settingsPatchSchema.safeParse({ mediaSaveDir: "/tv" });
    expect(result.success).toBe(true);
  });

  it("accepts both fields", () => {
    const result = settingsPatchSchema.safeParse({
      scanRoot: "/movies",
      mediaSaveDir: "/tv",
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty body", () => {
    const result = settingsPatchSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("rejects empty strings", () => {
    expect(settingsPatchSchema.safeParse({ scanRoot: "" }).success).toBe(false);
    expect(settingsPatchSchema.safeParse({ mediaSaveDir: "" }).success).toBe(
      false,
    );
  });
});
