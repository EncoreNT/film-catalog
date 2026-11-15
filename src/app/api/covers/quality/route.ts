import { NextResponse } from "next/server";
import { jsonError } from "@/lib/api/api-utils";
import { getPosterQualityReport } from "@/lib/covers/poster-quality-report";

export const runtime = "nodejs";

async function report(force: boolean) {
  try {
    return NextResponse.json(await getPosterQualityReport(force), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return jsonError("Не удалось проверить постеры. Проверьте доступ к папке обложек и повторите попытку.", 500);
  }
}

export async function GET() { return report(false); }
export async function POST() { return report(true); }
