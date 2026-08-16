import { NextRequest, NextResponse } from "next/server";
import { raterReorderSchema } from "@/lib/api/validators";
import { reorderRaters } from "@/lib/raters/rater-crud";
import {
  isErrorResponse,
  mapDomainError,
  parseRequestBody,
} from "@/lib/api/api-utils";

export async function POST(request: NextRequest) {
  const data = await parseRequestBody(request, raterReorderSchema);
  if (isErrorResponse(data)) return data;

  try {
    const raters = await reorderRaters(data.ids);
    return NextResponse.json(raters);
  } catch (err) {
    return mapDomainError(err, "Не удалось изменить порядок оценщиков");
  }
}
