import type { Prisma } from "@/generated/prisma/client";
import { franchiseListQuerySchema } from "@/lib/api/validators";
import { normalizeSearchText } from "@/lib/shared/search-text";

export function parseFranchiseListQuery(searchParams: URLSearchParams) {
  const raw = Object.fromEntries(searchParams.entries());
  return franchiseListQuerySchema.parse({
    ...raw,
    page: raw.page ?? "1",
    limit: raw.limit ?? "48",
    sort: raw.sort ?? "name",
    order: raw.order ?? "asc",
  });
}

export function buildFranchiseWhere(
  _query: ReturnType<typeof parseFranchiseListQuery>,
): Prisma.FranchiseWhereInput {
  // Text search is applied in listFranchises (SQLite + Cyrillic need ru-aware matching).
  return {};
}

/** Normalized needle for franchise name search, or null when q is empty. */
export function franchiseSearchNeedle(
  q: string | undefined,
): string | null {
  if (!q?.trim()) return null;
  return normalizeSearchText(q);
}

export function buildFranchiseOrder(
  query: ReturnType<typeof parseFranchiseListQuery>,
): Prisma.FranchiseOrderByWithRelationInput {
  const order = query.order ?? "asc";

  switch (query.sort) {
    case "createdAt":
      return { createdAt: order };
    case "slotCount":
      return { slots: { _count: order } };
    case "name":
    default:
      return { name: order };
  }
}
