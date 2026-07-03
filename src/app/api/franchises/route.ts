import { NextRequest, NextResponse } from "next/server";
import { franchiseCreateSchema } from "@/lib/api/validators";
import { createFranchise } from "@/lib/franchises/create-franchise";
import { listFranchises } from "@/lib/franchises/list-franchises";
import {
  mapDomainError,
  paginatedResponse,
  parseRequestBody,
  isErrorResponse,
} from "@/lib/api/api-utils";

export async function GET(request: NextRequest) {
  const { items, page, limit, total } = await listFranchises(request);
  return paginatedResponse(items, { page, limit, total });
}

export async function POST(request: NextRequest) {
  const data = await parseRequestBody(request, franchiseCreateSchema);
  if (isErrorResponse(data)) return data;

  try {
    const franchise = await createFranchise(data);
    return NextResponse.json(franchise, { status: 201 });
  } catch (err) {
    return mapDomainError(err, "Не удалось создать франшизу");
  }
}
