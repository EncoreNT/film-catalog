import { NextResponse } from "next/server";
import {
  jsonError,
  mapDomainError,
  parseRouteId,
  type RouteContext,
  isErrorResponse,
} from "@/lib/api/api-utils";
import { moveInclude } from "@/lib/releases/move-queue";
import { serializeMove } from "@/lib/releases/move-serialize";
import { prisma } from "@/lib/db/prisma";

export async function GET(_request: Request, context: RouteContext) {
  const id = await parseRouteId(context.params);
  if (isErrorResponse(id)) return id;

  const job = await prisma.releaseMove.findUnique({
    where: { id },
    include: moveInclude,
  });
  if (!job) return jsonError("Перемещение не найдено", 404);
  return NextResponse.json(serializeMove(job));
}
