import { NextResponse } from "next/server";
import { getStatsOverview } from "@/lib/catalog/archive-metrics";

export async function GET() {
  const stats = await getStatsOverview();
  return NextResponse.json(stats);
}
