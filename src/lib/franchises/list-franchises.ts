import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import {
  buildFranchiseOrder,
  buildFranchiseWhere,
  franchiseSearchNeedle,
  parseFranchiseListQuery,
} from "@/lib/franchises/franchise-query";
import { franchiseInclude } from "@/lib/franchises/franchise-include";
import { searchTextIncludes } from "@/lib/shared/search-text";

export async function listFranchises(request: NextRequest) {
  const query = parseFranchiseListQuery(request.nextUrl.searchParams);
  const where = buildFranchiseWhere(query);
  const searchNeedle = franchiseSearchNeedle(query.q);
  const page = query.page ?? 1;
  const limit = query.limit ?? 48;
  const skip = (page - 1) * limit;
  const lite = request.nextUrl.searchParams.get("lite") === "1";

  if (searchNeedle) {
    const orderBy = lite ? { name: "asc" as const } : buildFranchiseOrder(query);
    const all = lite
      ? await prisma.franchise.findMany({
          where,
          orderBy,
          select: { id: true, name: true, slug: true },
        })
      : await prisma.franchise.findMany({
          where,
          orderBy,
          include: franchiseInclude,
        });
    const filtered = all.filter((f) => searchTextIncludes(f.name, searchNeedle));
    return {
      items: filtered.slice(skip, skip + limit),
      page,
      limit,
      total: filtered.length,
    };
  }

  if (lite) {
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
