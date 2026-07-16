import { NextResponse } from "next/server";
import {
  jsonError,
  mapDomainError,
  parseRouteId,
  type RouteContext,
  isErrorResponse,
} from "@/lib/api/api-utils";
import { requestBuildCancel } from "@/lib/builds/build-queue";
import { serializeBuild } from "@/lib/builds/build-serialize";

export async function POST(
  _request: Request,
  context: RouteContext,
) {
  const id = await parseRouteId(context.params);
  if (isErrorResponse(id)) return id;

  try {
    const build = await requestBuildCancel(id);
    return NextResponse.json(serializeBuild(build));
  } catch (err) {
    return mapDomainError(err);
  }
}
