import { describe, expect, it } from "vitest";
import { ndjsonResponse, parseNdjsonStream } from "@/lib/api/ndjson-stream";

function streamFromChunks(chunks: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  let index = 0;
  return new ReadableStream({
    pull(controller) {
      if (index < chunks.length) {
        controller.enqueue(encoder.encode(chunks[index]));
        index += 1;
        return;
      }
      controller.close();
    },
  });
}

describe("ndjson-stream", () => {
  describe("parseNdjsonStream", () => {
    it("parses complete lines from a single chunk", async () => {
      const events: Array<{ type: string; n?: number }> = [];
      await parseNdjsonStream(
        streamFromChunks([
          '{"type":"start","total":2}\n{"type":"file","n":1}\n',
        ]),
        (event: { type: string; n?: number }) => events.push(event),
      );
      expect(events).toEqual([
        { type: "start", total: 2 },
        { type: "file", n: 1 },
      ]);
    });

    it("buffers partial lines across chunks", async () => {
      const events: string[] = [];
      const part1 = '{"type":"a"';
      const part2 = ',"value":1}\n';
      await parseNdjsonStream(
        streamFromChunks([part1, part2]),
        (event: { type: string }) => events.push(event.type),
      );
      expect(events).toEqual(["a"]);
    });

    it("parses trailing line without newline", async () => {
      const events: number[] = [];
      await parseNdjsonStream(
        streamFromChunks(['{"n":1}\n{"n":2}']),
        (event: { n: number }) => events.push(event.n),
      );
      expect(events).toEqual([1, 2]);
    });

    it("skips blank lines and malformed JSON", async () => {
      const events: string[] = [];
      await parseNdjsonStream(
        streamFromChunks(['\nnot-json\n{"type":"ok"}\n']),
        (event: { type: string }) => events.push(event.type),
      );
      expect(events).toEqual(["ok"]);
    });
  });

  describe("ndjsonResponse", () => {
    it("sets NDJSON headers and passes through the stream body", async () => {
      const body = streamFromChunks(['{"ok":true}\n']);
      const res = ndjsonResponse(body);
      expect(res.headers.get("Content-Type")).toBe(
        "application/x-ndjson; charset=utf-8",
      );
      expect(res.headers.get("Cache-Control")).toBe("no-cache, no-transform");
      expect(res.headers.get("X-Accel-Buffering")).toBe("no");
      const text = await new Response(res.body).text();
      expect(text).toBe('{"ok":true}\n');
    });
  });
});
