import { NextRequest } from "next/server";
import { jsonError } from "@/lib/api/api-utils";
import { kinorium, KinoriumError } from "@/lib/covers/kinorium-client";

export const runtime = "nodejs";

/** Same-origin download preserves original bytes and avoids CDN CORS restrictions. */
export async function GET(request: NextRequest) {
  try {
    const { buffer, mime } = await kinorium.image(
      request.nextUrl.searchParams.get("url") ?? "",
    );
    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type": mime,
        "Content-Length": String(buffer.length),
        "Cache-Control": "private, max-age=3600",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    return jsonError(
      error instanceof KinoriumError
        ? error.message
        : "Не удалось загрузить постер.",
      error instanceof KinoriumError ? error.status : 502,
    );
  }
}
