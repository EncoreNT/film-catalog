import { NextRequest, NextResponse } from "next/server";
import { jsonError, type RouteContext } from "@/lib/api/api-utils";
import { kinoriumIdSchema } from "@/lib/api/validators";
import { kinoriumBrowser } from "@/lib/covers/kinorium-browser";
import { KinoriumError } from "@/lib/covers/kinorium-client";

export const runtime = "nodejs";

export async function POST(request: NextRequest, context: RouteContext) {
  // Launching a local window must come from this catalog, not an external page.
  if (request.headers.get("origin") !== request.nextUrl.origin)
    return jsonError("Откройте галерею из окна выбора постера в каталоге.", 403);
  const id = kinoriumIdSchema.safeParse((await context.params).id);
  if (!id.success)
    return jsonError("Некорректный идентификатор Kinorium.", 400);
  try {
    const gallery = await kinoriumBrowser.gallery(id.data, request.signal);
    return NextResponse.json(gallery, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    return jsonError(
      error instanceof KinoriumError ? error.message : "Не удалось открыть Kinorium.",
      error instanceof KinoriumError ? error.status : 502,
    );
  }
}
