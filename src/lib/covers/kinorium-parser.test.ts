import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import {
  kinoriumImageUrl,
  parseKinoriumGallery,
  parseKinoriumSearch,
} from "./kinorium-parser";
import { mergeKinoriumPosters } from "./kinorium-types";
import {
  kinoriumIdSchema,
  kinoriumSearchSchema,
} from "@/lib/api/validators/kinorium";

// Shape and advertised sizes observed in Kinorium's public search response.
const film = {
  id: 776186,
  mixtype: "movie",
  name: "Кот в сапогах: Последнее желание",
  name_orig: "Puss in Boots: The Last Wish",
  year: "2022",
  poster: "https://ru-images.kinorium.com/movie/XXX/776186.jpg?1742905470",
  face: {
    src: "https://ru-images.kinorium.com/movie/XXX/776186.jpg?1742905470",
    sizes: { "300": ["300", "450"], original: ["2000", "3000"] },
    size: { width: "2000", height: "3000" },
  },
};

describe("Kinorium search parser", () => {
  it("does not label a fallback rendition with dimensions of an unadvertised original", () => {
    const [movie] = parseKinoriumSearch(
      { list: [{ ...film, face: { ...film.face, sizes: undefined } }] },
      "Кот",
    );
    expect(movie.poster).toMatchObject({ width: null, height: null });
    expect(movie.poster?.url).toContain("/1080/");
  });
  it("uses the advertised original and keeps the small preview separate", () => {
    const [movie] = parseKinoriumSearch(
      { list: [film] },
      "Кот в сапогах",
      2022,
    );
    expect(movie).toMatchObject({ id: 776186, year: 2022, title: film.name });
    expect(movie.poster).toMatchObject({
      url: "https://ru-images.kinorium.com/movie/original/776186.jpg?1742905470",
      previewUrl:
        "https://ru-images.kinorium.com/movie/300/776186.jpg?1742905470",
      width: 2000,
      height: 3000,
    });
  });

  it("ranks the year, then exact title; leaves alternatives available for manual choice", () => {
    const movies = parseKinoriumSearch(
      {
        list: [
          { ...film, id: 1, year: "2011", name: "Кот в сапогах" },
          film,
          { ...film, id: 2, name: "Кот в сапогах" },
        ],
      },
      "Кот в сапогах",
      2022,
    );
    expect(movies.map((movie) => movie.id)).toEqual([2, 776186, 1]);
  });

  it("decodes entities, rejects non-movies and bad IDs, deduplicates, tolerates missing posters", () => {
    const movies = parseKinoriumSearch(
      {
        list: [
          {
            ...film,
            name: "<b>Tom</b> &amp; Jerry&nbsp;",
            face: undefined,
            poster: "http://localhost/x.jpg",
          },
          film,
          { ...film, id: -1 },
          { ...film, id: true },
          { ...film, id: 9, mixtype: "persona" },
          { ...film, id: 8, name: "", name_orig: "" },
        ],
      },
      "Tom",
    );
    expect(movies).toHaveLength(1);
    expect(movies[0]).toMatchObject({ title: "Tom & Jerry", poster: null });
  });

  it("distinguishes no matches from a challenge or changed payload", () => {
    expect(parseKinoriumSearch({ list: [] }, "test")).toEqual([]);
    expect(() =>
      parseKinoriumSearch({ error: "request_error" }, "test"),
    ).toThrow();
    expect(() => parseKinoriumSearch(null, "test")).toThrow();
  });
});

describe("Kinorium request validation", () => {
  it("trims the title and converts a valid year", () => {
    expect(kinoriumSearchSchema.parse({ q: "  Кот  ", year: "2022" })).toEqual({
      q: "Кот",
      year: 2022,
    });
  });

  it("rejects missing or excessive queries and invalid years before fetching", () => {
    for (const query of [
      { q: " " },
      { q: "a".repeat(201) },
      { q: "Кот", year: "NaN" },
      { q: "Кот", year: "2022.5" },
    ]) {
      expect(kinoriumSearchSchema.safeParse(query).success).toBe(false);
    }
    for (const id of ["-1", "1.5", "NaN", "999999999"]) {
      expect(kinoriumIdSchema.safeParse(id).success).toBe(false);
    }
  });
});

describe("Kinorium gallery parser", () => {
  it("parses real gallery markup, using HD only when the page advertises it", () => {
    const html = readFileSync(new URL("./fixtures/kinorium-gallery.html", import.meta.url), "utf8");
    const gallery = parseKinoriumGallery(html);
    expect(gallery.status).toBe("available");
    expect(gallery.posters).toHaveLength(3);
    expect(gallery.posters[0]).toMatchObject({
      id: "51663170", width: 1364, height: 2042,
      url: "https://images.kinorium.com/movie/poster/776186/w1500_51663170.jpg",
    });
    expect(gallery.posters[1]).toMatchObject({
      width: 2000, height: 3000,
      url: "https://images.kinorium.com/movie/poster/776186/original_51615399.jpg",
      previewUrl: "https://images.kinorium.com/movie/poster/776186/h280_51615399.jpg",
    });
  });
  // Contract fixture based on the site's photoGallery script, not a downloaded gallery.
  const poster = `<div class="gallery_page__item"><img data-id="12" data-image_type="poster"
    data-photo="https://images.kinorium.com/movie/poster/w1500/776186_12.jpg"
    data-photo-hd="https://images.kinorium.com/movie/poster/776186_12.jpg?x=1&amp;y=2"
    data-preload="//images.kinorium.com/movie/poster/h280/776186_12.jpg"
    data-width="2000" data-height="3000"></div>`;

  it("takes the HD link, dimensions and lazy preview, deduplicating repeated images", () => {
    const result = parseKinoriumGallery(poster + poster);
    expect(result.status).toBe("available");
    expect(result.posters).toHaveLength(1);
    expect(result.posters[0]).toMatchObject({
      id: "12",
      width: 2000,
      height: 3000,
      url: "https://images.kinorium.com/movie/poster/776186_12.jpg?x=1&y=2",
      previewUrl: "https://images.kinorium.com/movie/poster/h280/776186_12.jpg",
    });
  });

  it("ignores actors, video thumbnails, shots and foreign image hosts", () => {
    const result = parseKinoriumGallery(
      poster.replace('data-image_type="poster"', 'data-image_type="shot"') +
        poster.replace(
          'data-id="12"',
          'data-id="12" data-video="https://example.com/video"',
        ) +
        poster.replaceAll("images.kinorium.com", "evil.example") +
        '<img data-photo="https://images.kinorium.com/movie/300/123.jpg">',
    );
    expect(result.posters).toEqual([]);
  });

  it("recognizes both browser checks and CAPTCHA without calling them empty galleries", () => {
    for (const title of ["Checking browser", "Captcha", "403 Forbidden"]) {
      expect(parseKinoriumGallery(`<title>${title}</title>`).status).toBe(
        "blocked",
      );
    }
    expect(
      parseKinoriumGallery('<div class="emptyGallery">Нет постеров</div>')
        .status,
    ).toBe("empty");
    expect(parseKinoriumGallery("<html>Unexpected markup</html>").status).toBe(
      "unavailable",
    );
  });

  it("keeps the main poster on blocked galleries and removes exact duplicates", () => {
    const [movie] = parseKinoriumSearch({ list: [film] }, "Кот");
    expect(mergeKinoriumPosters(movie.poster, [])).toEqual([movie.poster]);
    expect(mergeKinoriumPosters(movie.poster, [movie.poster!])).toHaveLength(1);
  });
});

describe("Kinorium image allowlist", () => {
  it.each([
    "http://ru-images.kinorium.com/movie/original/1.jpg",
    "https://localhost/movie/1.jpg",
    "https://ru-images.kinorium.com.evil.example/movie/1.jpg",
    "https://ru-images.kinorium.com@evil.example/movie/1.jpg",
    "https://user:pass@ru-images.kinorium.com/movie/1.jpg",
    "https://ru-images.kinorium.com:3000/movie/1.jpg",
    "https://ru-images.kinorium.com/captcha/1.jpg",
    "https://ru-images.kinorium.com/movie/XXX/1.jpg",
    "https://ru-images.kinorium.com/movie/1.svg",
    "file:///tmp/image.jpg",
    "javascript:alert(1)",
  ])("rejects %s", (url) => expect(kinoriumImageUrl(url)).toBeNull());
});
