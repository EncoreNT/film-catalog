import { MPLS_TICKS_PER_SECOND } from "@/lib/media/bdmv/mpls-parse";

/** Minimal MPLS bytes for unit tests (not used at runtime). */
export function encodeMinimalMpls(
  items: { clipId: string; inTime: number; outTime: number }[],
): Buffer {
  const playlistStart = 40;
  const itemBytes = 22;
  const afterLength = 6 + items.length * itemBytes;
  const buf = Buffer.alloc(playlistStart + 4 + afterLength);
  buf.write("MPLS", 0, 4, "ascii");
  buf.write("0200", 4, 4, "ascii");
  buf.writeUInt32BE(playlistStart, 8);
  buf.writeUInt32BE(afterLength, playlistStart);
  buf.writeUInt16BE(items.length, playlistStart + 6);
  buf.writeUInt16BE(0, playlistStart + 8);
  let offset = playlistStart + 10;
  for (const item of items) {
    buf.writeUInt16BE(20, offset);
    buf.write(item.clipId.padEnd(5, "0").slice(0, 5), offset + 2, 5, "ascii");
    buf.write("M2TS", offset + 7, 4, "ascii");
    buf.writeUInt32BE(item.inTime, offset + 14);
    buf.writeUInt32BE(item.outTime, offset + 18);
    offset += itemBytes;
  }
  return buf;
}

export function ticksForSeconds(seconds: number): number {
  return seconds * MPLS_TICKS_PER_SECOND;
}
