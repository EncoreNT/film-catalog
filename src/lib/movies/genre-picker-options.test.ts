import { describe, expect, it } from "vitest";
import { GENRES } from "@/lib/shared/dictionaries";
import { genrePickerOptions } from "./genre-picker-options";

describe("genrePickerOptions", () => {
  it("defaults to Russian label order, independently of dictionary order and counts", () => {
    const options = genrePickerOptions([{ value: "thriller", count: 100 }]);
    expect(options.slice(0, 5).map((option) => option.label)).toEqual([
      "Анимация",
      "Аниме",
      "Биография",
      "Боевик",
      "Вестерн",
    ]);
    expect(options.map((option) => option.label)).toEqual(
      GENRES.map((genre) => genre.label).sort((a, b) =>
        a.localeCompare(b, "ru"),
      ),
    );
    expect(GENRES[0].value).toBe("action");
  });
  it("ranks collection counts descending and breaks ties alphabetically, retaining zero-use genres", () => {
    const options = genrePickerOptions(
      [
        { value: "thriller", count: 20 },
        { value: "action", count: 20 },
        { value: "drama", count: 35 },
        { value: "unknown", count: 999 },
      ],
      "popular",
    );
    expect(
      options.slice(0, 4).map((option) => [option.value, option.count]),
    ).toEqual([
      ["drama", 35],
      ["action", 20],
      ["thriller", 20],
      ["animation", 0],
    ]);
    expect(options).toHaveLength(GENRES.length);
  });
  it("filters Russian labels without case or surrounding whitespace sensitivity", () => {
    expect(
      genrePickerOptions([], "alphabetical", "  ДРАМА ").map(
        (option) => option.label,
      ),
    ).toEqual(["Драма", "Мелодрама"]);
    expect(genrePickerOptions([], "popular", "несуществующий")).toEqual([]);
  });
});
