import type { Prisma } from "@/generated/prisma/client";
import { franchiseListQuerySchema } from "./validators";

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
  query: ReturnType<typeof parseFranchiseListQuery>,
): Prisma.FranchiseWhereInput {
  const where: Prisma.FranchiseWhereInput = {};

  if (query.q) {
    where.name = { contains: query.q };
  }

  return where;
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
