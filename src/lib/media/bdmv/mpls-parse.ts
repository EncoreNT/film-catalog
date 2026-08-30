export const MPLS_TICKS_PER_SECOND = 45_000;

export interface MplsPlayItem {
  clipId: string;
  inTime: number;
  outTime: number;
  durationSeconds: number;
}

export interface ParsedMpls {
  clips: string[];
  durationSeconds: number;
  items: MplsPlayItem[];
}

function readAscii(buffer: Buffer, start: number, length: number): string {
  return buffer.subarray(start, start + length).toString("ascii");
}

/** Parse a Blu-ray playlist (.mpls) for clip names and duration (45 kHz timestamps). */
export function parseMpls(buffer: Buffer): ParsedMpls {
  if (buffer.length < 12) {
    throw new Error("Файл плейлиста слишком короткий");
  }
  const magic = readAscii(buffer, 0, 4);
  if (magic !== "MPLS") {
    throw new Error("Не файл плейлиста MPLS");
  }
  const version = readAscii(buffer, 4, 4);
  if (version !== "0100" && version !== "0200" && version !== "0300") {
    throw new Error(`Неподдерживаемая версия MPLS: ${version}`);
  }

  const playlistStart = buffer.readUInt32BE(8);
  if (playlistStart + 10 > buffer.length) {
    throw new Error("Повреждённый плейлист MPLS");
  }

  const numberOfPlayItems = buffer.readUInt16BE(playlistStart + 6);
  let offset = playlistStart + 10;
  const items: MplsPlayItem[] = [];

  for (let i = 0; i < numberOfPlayItems; i++) {
    if (offset + 2 > buffer.length) {
      throw new Error("Повреждённый плейлист MPLS");
    }
    const itemLength = buffer.readUInt16BE(offset);
    const itemStart = offset + 2;
    if (itemStart + 20 > buffer.length || itemLength < 20) {
      throw new Error("Повреждённый плейлист MPLS");
    }
    const clipId = readAscii(buffer, itemStart, 5).replace(/\0/g, "").trim();
    const codec = readAscii(buffer, itemStart + 5, 4);
    if (codec !== "M2TS") {
      throw new Error("Плейлист ссылается не на M2TS-клип");
    }
    const inTime = buffer.readUInt32BE(itemStart + 12);
    const outTime = buffer.readUInt32BE(itemStart + 16);
    const durationSeconds = Math.max(0, outTime - inTime) / MPLS_TICKS_PER_SECOND;
    items.push({ clipId, inTime, outTime, durationSeconds });
    offset = itemStart + itemLength;
  }

  const durationSeconds = items.reduce((sum, item) => sum + item.durationSeconds, 0);
  const clips = [...new Set(items.map((item) => item.clipId).filter(Boolean))];
  return { clips, durationSeconds, items };
}
