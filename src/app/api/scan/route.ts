import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getScanRoot, setScanRoot } from "@/lib/settings";
import { scanDirectory } from "@/lib/scanner";
import { scanRootSchema } from "@/lib/validators";

export async function GET() {
  const scanRoot = await getScanRoot();
  return NextResponse.json({ scanRoot });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { scanRoot } = scanRootSchema.parse(body);

    await setScanRoot(scanRoot);
    const summary = await scanDirectory(scanRoot);

    return NextResponse.json({ scanRoot, summary });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Scan failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { scanRoot } = scanRootSchema.parse(body);
    await setScanRoot(scanRoot);
    return NextResponse.json({ scanRoot });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid scan root";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
