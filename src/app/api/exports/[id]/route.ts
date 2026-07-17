import { NextResponse } from "next/server";
import {
  jsonError,
  mapDomainError,
  parseRouteId,
  type RouteContext,
  isErrorResponse,
} from "@/lib/api/api-utils";
import { exportInclude } from "@/lib/releases/export-queue";
import { serializeExport } from "@/lib/releases/export-serialize";
import { prisma } from "@/lib/db/prisma";

export async function GET(_request: Request, context: RouteContext) {
  const id = await parseRouteId(context.params);
  if (isErrorResponse(id)) return id;

  const job = await prisma.releaseExport.findUnique({
    where: { id },
    include: exportInclude,
  });
  if (!job) return jsonError("Экспорт не найден", 404);
  return NextResponse.json(serializeExport(job));
}
