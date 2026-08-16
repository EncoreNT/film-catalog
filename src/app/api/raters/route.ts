import { NextRequest, NextResponse } from "next/server";
import { raterCreateSchema } from "@/lib/api/validators";
import {
  createRater,
  listRaters,
} from "@/lib/raters/rater-crud";
import {
  isErrorResponse,
  mapDomainError,
  parseRequestBody,
} from "@/lib/api/api-utils";

export async function GET() {
  const raters = await listRaters();
  return NextResponse.json(raters);
}

export async function POST(request: NextRequest) {
  const data = await parseRequestBody(request, raterCreateSchema);
  if (isErrorResponse(data)) return data;

  try {
    const rater = await createRater(data.name);
    return NextResponse.json(rater, { status: 201 });
  } catch (err) {
    return mapDomainError(err, "Не удалось создать оценщика");
  }
}
