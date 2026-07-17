import { NextResponse } from "next/server";
import { jsonError, mapDomainError } from "@/lib/api/api-utils";
import { buildReorderQueueSchema } from "@/lib/api/validators/build";
import { reorderQueuedBuilds } from "@/lib/builds/build-queue";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Некорректный JSON", 400);
  }

  const parsed = buildReorderQueueSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? "Некорректные данные", 400);
  }

  try {
    const items = await reorderQueuedBuilds(parsed.data.orderedIds);
    return NextResponse.json({ items });
  } catch (err) {
    return mapDomainError(err);
  }
}
