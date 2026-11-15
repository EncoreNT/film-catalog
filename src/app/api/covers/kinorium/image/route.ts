import { NextRequest } from "next/server";
import { jsonError } from "@/lib/api/api-utils";
import { kinorium, KinoriumError } from "@/lib/covers/kinorium-client";
import { prepareKinoriumPoster } from "@/lib/covers/prepare-kinorium-poster";

export const runtime = "nodejs";

/** Resize on the server so the browser and catalog receive only the display copy. */
export async function GET(request: NextRequest) {
  try {
    const original = await kinorium.image(
      request.nextUrl.searchParams.get("url") ?? "",
    );
    const { buffer, mime } = await prepareKinoriumPoster(original.buffer);
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
