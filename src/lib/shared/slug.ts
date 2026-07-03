import type { Prisma } from "@/generated/prisma/client";

const CYRILLIC_TO_LATIN: Record<string, string> = {
  а: "a",
  б: "b",
  в: "v",
  г: "g",
  д: "d",
  е: "e",
  ё: "yo",
  ж: "zh",
  з: "z",
  и: "i",
  й: "y",
  к: "k",
  л: "l",
  м: "m",
  н: "n",
  о: "o",
  п: "p",
  р: "r",
  с: "s",
  т: "t",
  у: "u",
  ф: "f",
  х: "kh",
  ц: "ts",
  ч: "ch",
  ш: "sh",
  щ: "shch",
  ъ: "",
  ы: "y",
  ь: "",
  э: "e",
  ю: "yu",
  я: "ya",
};

const MAX_SLUG_LENGTH = 200;

type DbClient = Prisma.TransactionClient | {
  movie: {
    findFirst: (args: {
      where: { slug: string; NOT?: { id: number } };
      select: { id: true };
    }) => Promise<{ id: number } | null>;
  };
  franchise: {
    findFirst: (args: {
      where: { slug: string; NOT?: { id: number } };
      select: { id: true };
    }) => Promise<{ id: number } | null>;
  };
};

export async function resolveEntitySlug(
  db: DbClient,
  options: {
    table: "movie" | "franchise";
    text: string;
    excludeId?: number;
  },
): Promise<string> {
  const base = slugifyTitle(options.text);
  let candidate = base;
  let suffix = 2;
  const { table, excludeId } = options;

  while (true) {
    const where = {
      slug: candidate,
      ...(excludeId != null ? { NOT: { id: excludeId } } : {}),
    };
    const existing =
      table === "movie"
        ? await db.movie.findFirst({ where, select: { id: true } })
        : await db.franchise.findFirst({ where, select: { id: true } });

    if (!existing) return candidate;

    candidate = `${base}-${suffix}`;
    suffix += 1;
  }
}

export function slugifyTitle(title: string): string {
  const transliterated = [...title.trim().toLowerCase()]
    .map((char) => CYRILLIC_TO_LATIN[char] ?? char)
    .join("");

  const slug = transliterated
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-+/g, "-");

  if (!slug) return "film";

  return slug.length > MAX_SLUG_LENGTH
    ? slug.slice(0, MAX_SLUG_LENGTH).replace(/-+$/g, "")
    : slug;
}
