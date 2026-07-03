import { NextResponse } from "next/server";

export type RouteContext = { params: Promise<{ id: string }> };
export type ReleaseRouteContext = {
  params: Promise<{ id: string; releaseId: string }>;
};
export type MovieFranchiseRouteContext = {
  params: Promise<{ id: string; franchiseId: string }>;
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

export async function parseReleaseId(
  params: Promise<{ releaseId: string }>,
): Promise<number | NextResponse> {
  const { releaseId } = await params;
  const numericId = Number(releaseId);
  if (!Number.isInteger(numericId) || numericId <= 0) {
    return jsonError("Некорректный id релиза", 400);
  }
  return numericId;
}

export async function parseMovieFranchiseIds(
  params: Promise<{ id: string; franchiseId: string }>,
): Promise<{ movieId: number; franchiseId: number } | NextResponse> {
  const resolved = await params;
  const movieId = parseInt(resolved.id, 10);
  const franchiseId = parseInt(resolved.franchiseId, 10);
  if (Number.isNaN(movieId) || Number.isNaN(franchiseId)) {
    return jsonError("Некорректный идентификатор", 400);
  }
  return { movieId, franchiseId };
}

export function isErrorResponse(
  value: number | NextResponse | { movieId: number; franchiseId: number },
): value is NextResponse {
  return value instanceof NextResponse;
}
