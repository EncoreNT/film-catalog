import { NextRequest, NextResponse } from "next/server";
import { jsonError, type RouteContext } from "@/lib/api/api-utils";
import { kinoriumIdSchema } from "@/lib/api/validators";
import { kinorium } from "@/lib/covers/kinorium-client";

export const runtime = "nodejs";

export async function GET(_request: NextRequest, context: RouteContext) {
  const id = kinoriumIdSchema.safeParse((await context.params).id);
  if (!id.success)
    return jsonError("Некорректный идентификатор Kinorium.", 400);
  return NextResponse.json(await kinorium.gallery(id.data), {
    headers: { "Cache-Control": "no-store" },
  });
}
