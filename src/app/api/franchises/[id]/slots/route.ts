import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import {
  isErrorResponse,
  parseRouteId,
  type RouteContext,
} from "@/lib/api/api-utils";

export async function GET(_request: NextRequest, context: RouteContext) {
  const franchiseId = await parseRouteId(context.params);
  if (isErrorResponse(franchiseId)) return franchiseId;

  const slots = await prisma.franchiseSlot.findMany({
    where: { franchiseId },
    orderBy: { storyOrder: "asc" },
    select: {
      id: true,
      storyOrder: true,
      movieId: true,
      titleHint: true,
      yearHint: true,
      movie: { select: { id: true, title: true, year: true, slug: true } },
    },
  });

  return NextResponse.json(slots);
}
