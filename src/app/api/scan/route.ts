import { NextRequest, NextResponse } from "next/server";
import { getScanRoot, setScanRoot } from "@/lib/settings";
import { scanDirectory, type ScanProgressEvent } from "@/lib/scanner";
import { scanRootSchema } from "@/lib/validators";

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
  try {
    ({ scanRoot } = scanRootSchema.parse(body));
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid scan root";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  await setScanRoot(scanRoot);

  // Stream newline-delimited JSON progress events to the client. Each line is
  // one ScanProgressEvent. The client reads them via response.body and updates
  // the progress modal. When the client aborts the fetch (cancel button),
  // request.signal aborts and is forwarded into scanDirectory, which stops
  // cooperatively. After an abort the controller is gone, so enqueues become
  // no-ops rather than throwing into the scan loop.
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
