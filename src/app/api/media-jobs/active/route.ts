import { NextResponse } from "next/server";
import { fetchActiveMediaJobs } from "@/lib/media/active-media-jobs";

export async function GET() {
  const payload = await fetchActiveMediaJobs();
  return NextResponse.json(payload);
}
