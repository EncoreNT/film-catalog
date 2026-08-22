import { ndjsonResponse } from "@/lib/api/ndjson-stream";
import {
  rescanHdr10PlusReleases,
  type Hdr10PlusRescanEvent,
} from "@/lib/media/hdr10plus-rescan";

export function createHdr10PlusRescanStream(signal: AbortSignal): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let closed = false;
      const enqueue = (event: Hdr10PlusRescanEvent) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
        } catch {
          closed = true;
        }
      };

      try {
        await rescanHdr10PlusReleases({ signal, onProgress: enqueue });
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Ошибка перепрогона HDR10+";
        enqueue({
          type: "error",
          index: 0,
          total: 0,
          releaseId: 0,
          movieTitle: "",
          message,
        });
      } finally {
        if (!closed) {
          try {
            controller.close();
          } catch {
            // already closed
          }
        }
      }
    },
  });

  return ndjsonResponse(stream);
}
