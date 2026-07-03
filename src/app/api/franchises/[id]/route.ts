import { NextRequest, NextResponse } from "next/server";
import { franchiseUpdateSchema } from "@/lib/api/validators";
import { updateFranchise } from "@/lib/franchises/update-franchise";
import { deleteFranchise } from "@/lib/franchises/delete-franchise";
import {
  isErrorResponse,
  mapDomainError,
  parseRequestBody,
  parseRouteId,
  type RouteContext,
} from "@/lib/api/api-utils";

export async function PATCH(request: NextRequest, context: RouteContext) {
  const franchiseId = await parseRouteId(context.params);
  if (isErrorResponse(franchiseId)) return franchiseId;

  const data = await parseRequestBody(request, franchiseUpdateSchema);
  if (isErrorResponse(data)) return data;

  try {
    const franchise = await updateFranchise(franchiseId, data);
    return NextResponse.json(franchise);
  } catch (err) {
    return mapDomainError(err, "Не удалось обновить франшизу");
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  const franchiseId = await parseRouteId(context.params);
  if (isErrorResponse(franchiseId)) return franchiseId;

  await deleteFranchise(franchiseId);
  return NextResponse.json({ ok: true });
}
