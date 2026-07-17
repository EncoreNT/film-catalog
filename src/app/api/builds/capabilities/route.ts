import { NextResponse } from "next/server";
import { getBuildCapabilities } from "@/lib/builds/build-capabilities";

export async function GET() {
  const capabilities = await getBuildCapabilities();
  return NextResponse.json(capabilities);
}
