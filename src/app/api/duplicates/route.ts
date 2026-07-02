import { NextResponse } from "next/server";
import { findAllDuplicateGroups } from "@/lib/alternative-quality";

export async function GET() {
  const groups = await findAllDuplicateGroups();
  return NextResponse.json({ groups });
}
