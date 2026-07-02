import { NextResponse } from "next/server";

export type RouteContext = { params: Promise<{ id: string }> };
export type ReleaseRouteContext = {
  params: Promise<{ id: string; releaseId: string }>;
};

export function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function parseRouteId(
  params: Promise<{ id: string }>,
): Promise<number | NextResponse> {
  const { id } = await params;
  const numericId = parseInt(id, 10);
  if (Number.isNaN(numericId)) {
    return jsonError("Некорректный идентификатор", 400);
  }
  return numericId;
}

export function isErrorResponse(
  value: number | NextResponse,
): value is NextResponse {
  return value instanceof NextResponse;
}
