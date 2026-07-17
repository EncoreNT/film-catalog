import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import {
  jsonError,
  parseRouteId,
  type RouteContext,
  isErrorResponse,
} from "@/lib/api/api-utils";
import { buildInclude } from "@/lib/builds/build-queue";
import { serializeBuild } from "@/lib/builds/build-serialize";

export async function GET(
  _request: Request,
  context: RouteContext,
) {
  const id = await parseRouteId(context.params);
  if (isErrorResponse(id)) return id;

  const build = await prisma.releaseBuild.findUnique({
    where: { id },
    include: buildInclude,
  });
  if (!build) return jsonError("Сборка не найдена", 404);
  return NextResponse.json(serializeBuild(build));
}
