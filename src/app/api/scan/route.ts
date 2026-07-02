import { NextRequest, NextResponse } from "next/server";
import { getScanRoot, setScanRoot } from "@/lib/settings";
import { scanDirectory, type ScanProgressEvent } from "@/lib/scanner";
import { scanRequestSchema, scanRootSchema } from "@/lib/validators";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const scanRoot = await getScanRoot();
  return NextResponse.json({ scanRoot });
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Некорректный запрос" }, { status: 400 });
  }

  let scanRoot: string;
  let externalStorageId: number | null = null;
  try {
    const parsed = scanRequestSchema.parse(body);
    scanRoot = parsed.scanRoot;
    externalStorageId = parsed.externalStorageId ?? null;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid scan root";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  if (externalStorageId != null) {
    const storage = await prisma.externalStorage.findUnique({
      where: { id: externalStorageId },
    });
    if (!storage) {
      return NextResponse.json({ error: "Внешний диск не найден" }, { status: 400 });
    }
  }

  await setScanRoot(scanRoot);

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let closed = false;
      const enqueue = (event: ScanProgressEvent | { type: "error"; message: string }) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
        } catch {
          closed = true;
        }
      };

      try {
        await scanDirectory(scanRoot, {
          signal: request.signal,
          onProgress: enqueue,
          externalStorageId,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : "Scan failed";
        enqueue({ type: "error", message });
      } finally {
        if (!closed) {
          try {
            controller.close();
          } catch {
            // already closed/errored — nothing to do
          }
        }
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
    },
  });
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
