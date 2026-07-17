import { NextResponse } from "next/server";
import {
  mapDomainError,
  parseRouteId,
  type RouteContext,
  isErrorResponse,
} from "@/lib/api/api-utils";
import { retryExport } from "@/lib/releases/export-queue";
import { serializeExport } from "@/lib/releases/export-serialize";

export async function POST(_request: Request, context: RouteContext) {
  const id = await parseRouteId(context.params);
  if (isErrorResponse(id)) return id;

  try {
    const job = await retryExport(id);
    return NextResponse.json(serializeExport(job));
  } catch (err) {
    return mapDomainError(err);
  }
}
