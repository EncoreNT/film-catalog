import { load } from "cheerio";
import { z } from "zod";
import { normalizeSearchText } from "@/lib/shared/text-normalize";
import type {
  KinoriumGallery,
  KinoriumMovie,
  KinoriumPoster,
} from "./kinorium-types";

const IMAGE_HOSTS = new Set([
  "images.kinorium.com",
  "ru-images.kinorium.com",
  "ua-images.kinorium.com",
  "en-images.kinorium.com",
]);

/** Also used before server downloads. Never turn this into a generic URL proxy. */
export function kinoriumImageUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value.startsWith("//") ? `https:${value}` : value);
    if (
      url.protocol !== "https:" ||
      !IMAGE_HOSTS.has(url.hostname) ||
      url.port ||
      url.username ||
      url.password ||
      !/^\/movie\/.+\.(jpe?g|png|webp|avif|gif)$/i.test(url.pathname) ||
      url.pathname.includes("/XXX/")
    )
      return null;
    url.hash = "";
    return url.href;
  } catch {
    return null;
  }
}

function positiveInteger(value: unknown): number | null {
  if (typeof value !== "number" && typeof value !== "string") return null;
  if (typeof value === "string" && !/^\d+$/.test(value)) return null;
  const number = Number(value);
  return Number.isSafeInteger(number) && number > 0 ? number : null;
}

const recordSchema = z.object({
  id: z.unknown(),
  mixtype: z.string().optional(),
  name: z.string().optional(),
  name_orig: z.string().optional(),
  year: z.unknown().optional(),
  year_serial_b: z.unknown().optional(),
  poster: z.string().optional(),
  face: z
    .object({
      src: z.string().optional(),
      sizes: z.record(z.string(), z.unknown()).optional(),
      size: z.object({ width: z.unknown(), height: z.unknown() }).optional(),
    })
    .optional(),
});

function plainText(value = ""): string {
  return load(value).text().replace(/\s+/g, " ").trim();
}

function mainPoster(
  movie: z.infer<typeof recordSchema>,
  id: number,
): KinoriumPoster | null {
  const template = movie.face?.src || movie.poster;
  if (!template) return null;
  const sizes = movie.face?.sizes;
  // Only use advertised sizes; do not invent an original URL for older results.
  const size = sizes?.original ? "original" : sizes?.["2500"] ? "2500" : "1080";
  const url = kinoriumImageUrl(template.replace("/XXX/", `/${size}/`));
  if (!url) return null;
  const dimensions = sizes?.[size];
  const width = Array.isArray(dimensions)
    ? dimensions[0]
    : !template.includes("/XXX/")
      ? movie.face?.size?.width
      : null;
  const height = Array.isArray(dimensions)
    ? dimensions[1]
    : !template.includes("/XXX/")
      ? movie.face?.size?.height
      : null;
  return {
    id: `main-${id}`,
    url,
    previewUrl: kinoriumImageUrl(template.replace("/XXX/", "/300/")) ?? url,
    width: positiveInteger(width),
    height: positiveInteger(height),
  };
}

/** Upstream JSON is undocumented. A changed envelope is an error, not zero matches. */
export function parseKinoriumSearch(
  payload: unknown,
  query: string,
  year?: number,
): KinoriumMovie[] {
  const envelope = z.object({ list: z.array(z.unknown()) }).parse(payload);
  const seen = new Set<number>();
  const movies: KinoriumMovie[] = [];
  for (const raw of envelope.list) {
    const parsed = recordSchema.safeParse(raw);
    if (!parsed.success || parsed.data.mixtype !== "movie") continue;
    const item = parsed.data;
    const id = positiveInteger(item.id);
    const title = plainText(item.name) || plainText(item.name_orig);
    if (!id || !title || seen.has(id)) continue;
    seen.add(id);
    movies.push({
      id,
      title,
      originalTitle: plainText(item.name_orig),
      year: positiveInteger(item.year) ?? positiveInteger(item.year_serial_b),
      poster: mainPoster(item, id),
    });
  }
  const needle = normalizeSearchText(query);
  const score = (movie: KinoriumMovie) =>
    (year && movie.year === year ? 2 : 0) +
    ([movie.title, movie.originalTitle].some(
      (title) => normalizeSearchText(title) === needle,
    )
      ? 1
      : 0);
  return movies.sort((a, b) => score(b) - score(a)).slice(0, 20);
}

/** Attributes are the same ones consumed by Kinorium's public photoGallery script. */
export function parseKinoriumGallery(html: string): KinoriumGallery {
  const $ = load(html);
  if (
    /captcha|checking browser|403 forbidden/i.test($("title").text()) ||
    $(".captcha, #captcha, [name='captcha']").length ||
    /Роботам вход воспрещен/.test($("body").text())
  ) {
    return { status: "blocked", posters: [] };
  }
  const posters: KinoriumPoster[] = [];
  const seen = new Set<string>();
  $(".gallery_page__item img[data-photo]").each((_, element) => {
    const image = $(element);
    const type = image.attr("data-image_type") ?? image.attr("data-image-type");
    if ((type && type !== "poster") || image.attr("data-video")) return;
    const regular = kinoriumImageUrl(image.attr("data-photo"));
    const url = kinoriumImageUrl(image.attr("data-photo-hd")) ?? regular;
    if (!url || seen.has(url)) return;
    seen.add(url);
    posters.push({
      id: image.attr("data-id") ?? url,
      url,
      previewUrl:
        kinoriumImageUrl(image.attr("data-preload")) ?? regular ?? url,
      width: positiveInteger(image.attr("data-width")),
      height: positiveInteger(image.attr("data-height")),
    });
  });
  return {
    status: posters.length
      ? "available"
      : $(".emptyGallery").length
        ? "empty"
        : "unavailable",
    posters: posters.slice(0, 250),
  };
}
