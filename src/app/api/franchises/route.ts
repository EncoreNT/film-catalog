import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  buildFranchiseOrder,
  buildFranchiseWhere,
  parseFranchiseListQuery,
} from "@/lib/franchise-query";
import { franchiseCreateSchema } from "@/lib/validators";
import { franchiseInclude } from "@/lib/franchise-include";
import { resolveFranchiseSlug } from "@/lib/franchise-slug";
import { syncFranchiseSlots } from "@/lib/franchise-slots";
import { jsonError } from "@/lib/api-utils";

export async function GET(request: NextRequest) {
  const query = parseFranchiseListQuery(request.nextUrl.searchParams);
  const where = buildFranchiseWhere(query);
  const orderBy = buildFranchiseOrder(query);
  const page = query.page ?? 1;
  const limit = query.limit ?? 48;
  const skip = (page - 1) * limit;

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
