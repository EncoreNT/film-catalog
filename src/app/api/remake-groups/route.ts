import { NextRequest, NextResponse } from "next/server";
import { remakeGroupCreateSchema } from "@/lib/api/validators";
import { createRemakeGroup } from "@/lib/remakes/create-remake-group";
import { listRemakeGroups } from "@/lib/remakes/list-remake-groups";
import {
  mapDomainError,
  paginatedResponse,
  parseRequestBody,
  isErrorResponse,
} from "@/lib/api/api-utils";

export async function GET(request: NextRequest) {
  const { items, page, limit, total } = await listRemakeGroups(request);
  return paginatedResponse(items, { page, limit, total });
}

export async function POST(request: NextRequest) {
  const data = await parseRequestBody(request, remakeGroupCreateSchema);
  if (isErrorResponse(data)) return data;

  try {
    const group = await createRemakeGroup(data);
    return NextResponse.json(group, { status: 201 });
  } catch (err) {
    return mapDomainError(err, "Не удалось создать группу ремейков");
  }
}
