import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { franchiseUpdateSchema } from "@/lib/validators";
import { franchiseInclude } from "@/lib/franchise-include";
import { resolveFranchiseSlug } from "@/lib/franchise-slug";
import { syncFranchiseSlots } from "@/lib/franchise-slots";
import {
  isErrorResponse,
  jsonError,
  parseRouteId,
  type RouteContext,
} from "@/lib/api-utils";

export async function PATCH(request: NextRequest, context: RouteContext) {
  const franchiseId = await parseRouteId(context.params);
  if (isErrorResponse(franchiseId)) return franchiseId;

  try {
    const body = await request.json();
    const data = franchiseUpdateSchema.parse(body);
    const { slots, ...franchiseData } = data;

    const franchise = await prisma.$transaction(async (tx) => {
      const slug =
        franchiseData.name !== undefined
          ? await resolveFranchiseSlug(tx, franchiseData.name, franchiseId)
          : undefined;

      await tx.franchise.update({
        where: { id: franchiseId },
        data: {
          ...franchiseData,
          slug,
          description:
            franchiseData.description === undefined
              ? undefined
              : franchiseData.description,
          coverPath:
            franchiseData.coverPath === undefined
              ? undefined
              : franchiseData.coverPath,
        },
      });

      if (slots !== undefined) {
        await syncFranchiseSlots(tx, franchiseId, slots);
      }

      return tx.franchise.findUnique({
        where: { id: franchiseId },
        include: franchiseInclude,
      });
    });

    return NextResponse.json(franchise);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Не удалось обновить франшизу";
    return jsonError(message, 400);
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  const franchiseId = await parseRouteId(context.params);
  if (isErrorResponse(franchiseId)) return franchiseId;

  await prisma.franchise.delete({ where: { id: franchiseId } });
  return NextResponse.json({ ok: true });
}
