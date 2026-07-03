import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import {
  buildFranchiseOrder,
  buildFranchiseWhere,
  parseFranchiseListQuery,
} from "@/lib/franchises/franchise-query";
import { franchiseInclude } from "@/lib/franchises/franchise-include";

export async function listFranchises(request: NextRequest) {
  const query = parseFranchiseListQuery(request.nextUrl.searchParams);
  const where = buildFranchiseWhere(query);
  const page = query.page ?? 1;
  const limit = query.limit ?? 48;
  const skip = (page - 1) * limit;

  if (request.nextUrl.searchParams.get("lite") === "1") {
    const [items, total] = await Promise.all([
      prisma.franchise.findMany({
        where,
        orderBy: { name: "asc" },
        skip,
        take: limit,
        select: { id: true, name: true, slug: true },
      }),
      prisma.franchise.count({ where }),
    ]);

    return { items, page, limit, total };
  }

  const orderBy = buildFranchiseOrder(query);

  const [items, total] = await Promise.all([
    prisma.franchise.findMany({
      where,
      orderBy,
      skip,
      take: limit,
      include: franchiseInclude,
    }),
    prisma.franchise.count({ where }),
  ]);

  return { items, page, limit, total };
}
