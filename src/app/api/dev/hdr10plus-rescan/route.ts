import { NextRequest } from "next/server";
import { createHdr10PlusRescanStream } from "@/lib/media/hdr10plus-rescan-stream";

export async function POST(request: NextRequest) {
  return createHdr10PlusRescanStream(request.signal);
}
