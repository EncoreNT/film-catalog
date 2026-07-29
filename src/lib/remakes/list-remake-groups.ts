import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { searchTextIncludes } from "@/lib/shared/search-text";
import { parseRemakeGroupListQuery } from "@/lib/remakes/remake-query";
import { remakeGroupInclude } from "@/lib/remakes/remake-include";

export async function listRemakeGroups(request: NextRequest) {
  const query = parseRemakeGroupListQuery(request.nextUrl.searchParams);
  const page = query.page ?? 1;
  const limit = query.limit ?? 48;
  const skip = (page - 1) * limit;
  const lite = request.nextUrl.searchParams.get("lite") === "1";
  const searchNeedle = query.q?.trim() ?? "";

  if (searchNeedle) {
    const all = lite
      ? await prisma.remakeGroup.findMany({
          orderBy: { name: "asc" },
          select: { id: true, name: true, slug: true },
        })
      : await prisma.remakeGroup.findMany({
          orderBy: { name: "asc" },
          include: remakeGroupInclude,
        });
    const filtered = all.filter((g) =>
      searchTextIncludes(g.name, searchNeedle),
    );
    return {
      items: filtered.slice(skip, skip + limit),
      page,
      limit,
      total: filtered.length,
    };
  }

  if (lite) {
    const [items, total] = await Promise.all([
      prisma.remakeGroup.findMany({
        orderBy: { name: "asc" },
        skip,
        take: limit,
        select: { id: true, name: true, slug: true },
      }),
      prisma.remakeGroup.count(),
    ]);
    return { items, page, limit, total };
  }

  const [items, total] = await Promise.all([
    prisma.remakeGroup.findMany({
      orderBy: { name: "asc" },
      skip,
      take: limit,
      include: remakeGroupInclude,
    }),
    prisma.remakeGroup.count(),
  ]);

  return { items, page, limit, total };
}
