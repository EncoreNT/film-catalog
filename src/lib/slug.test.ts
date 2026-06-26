import { describe, expect, it } from "vitest";
import { slugifyTitle } from "./slug";

describe("slugifyTitle", () => {
  it("transliterates cyrillic titles", () => {
    expect(slugifyTitle("Матрица")).toBe("matritsa");
    expect(slugifyTitle("Брат 2")).toBe("brat-2");
  });

  it("normalizes latin titles", () => {
    expect(slugifyTitle("Inception (2010)")).toBe("inception-2010");
    expect(slugifyTitle("  Dune: Part Two  ")).toBe("dune-part-two");
  });

  it("falls back when title has no slug characters", () => {
    expect(slugifyTitle("!!!")).toBe("film");
  });
});
