import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import {
  buildFranchiseOrder,
  buildFranchiseWhere,
  parseFranchiseListQuery,
} from "@/lib/franchises/franchise-query";
import { franchiseCreateSchema } from "@/lib/api/validators";
import { franchiseInclude } from "@/lib/franchises/franchise-include";
import { resolveFranchiseSlug } from "@/lib/franchises/franchise-slug";
import { syncFranchiseSlots } from "@/lib/franchises/franchise-slots";
import { jsonError } from "@/lib/api/api-utils";

export async function GET(request: NextRequest) {
  const query = parseFranchiseListQuery(request.nextUrl.searchParams);
  const where = buildFranchiseWhere(query);
  const page = query.page ?? 1;
  const limit = query.limit ?? 48;
  const skip = (page - 1) * limit;

  // Lightweight mode for picker dropdowns: returns only id/name/slug without
  // pulling every franchise's slots and movies.
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

    return NextResponse.json({
      items,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
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

  return NextResponse.json({
    items,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const data = franchiseCreateSchema.parse(body);
    const { slots, ...franchiseData } = data;

    const slug = await resolveFranchiseSlug(prisma, data.name);

    const franchise = await prisma.$transaction(async (tx) => {
      const created = await tx.franchise.create({
        data: {
          slug,
          name: franchiseData.name,
          description: franchiseData.description ?? null,
          coverPath: franchiseData.coverPath ?? null,
        },
      });

      if (slots?.length) {
        await syncFranchiseSlots(tx, created.id, slots);
      }

      return tx.franchise.findUnique({
        where: { id: created.id },
        include: franchiseInclude,
      });
    });

    return NextResponse.json(franchise, { status: 201 });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Не удалось создать франшизу";
    return jsonError(message, 400);
  }
}
