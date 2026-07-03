import { NextRequest, NextResponse } from "next/server";
import { listFranchiseSlots } from "@/lib/franchises/list-franchise-slots";
import {
  isErrorResponse,
  parseRouteId,
  type RouteContext,
} from "@/lib/api/api-utils";

export async function GET(_request: NextRequest, context: RouteContext) {
  const franchiseId = await parseRouteId(context.params);
  if (isErrorResponse(franchiseId)) return franchiseId;

  const slots = await listFranchiseSlots(franchiseId);
  return NextResponse.json(slots);
}
