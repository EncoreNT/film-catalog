import { NextRequest, NextResponse } from "next/server";
import { jsonError } from "@/lib/api/api-utils";
import { kinoriumSearchSchema } from "@/lib/api/validators";
import { kinorium, KinoriumError } from "@/lib/covers/kinorium-client";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const query = kinoriumSearchSchema.safeParse(
    Object.fromEntries(request.nextUrl.searchParams),
  );
  if (!query.success) return jsonError(query.error.issues[0].message, 400);
  try {
    const movies = await kinorium.search(query.data.q, query.data.year);
    return NextResponse.json(
      { movies },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return jsonError(
      error instanceof KinoriumError
        ? error.message
        : "Не удалось найти фильм в Kinorium.",
      error instanceof KinoriumError ? error.status : 502,
    );
  }
}
