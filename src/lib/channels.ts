const LAYOUT_MAP: Record<number, string> = {
  1: "1.0",
  2: "2.0",
  3: "2.1",
  4: "4.0",
  6: "5.1",
  7: "6.1",
  8: "7.1",
};

const LAYOUT_ALIASES: Record<string, string> = {
  mono: "1.0",
  stereo: "2.0",
  "2.0": "2.0",
  "2.1": "2.1",
  "3.0": "3.0",
  "4.0": "4.0",
  "5.0": "5.0",
  "5.1": "5.1",
  "5.1(side)": "5.1",
  "6.1": "6.1",
  "7.1": "7.1",
  "7.1(wide)": "7.1",
};

export function channelsToLayout(
  channels?: number | null,
  ffprobeLayout?: string | null,
): string | null {
  if (ffprobeLayout) {
    const normalized = ffprobeLayout.toLowerCase().trim();
    if (LAYOUT_ALIASES[normalized]) {
      return LAYOUT_ALIASES[normalized];
    }
    const match = normalized.match(/(\d+\.\d+)/);
    if (match) {
      return match[1];
    }
  }

  if (channels != null && LAYOUT_MAP[channels]) {
    return LAYOUT_MAP[channels];
  }

  if (channels != null) {
    return "other";
  }

  return null;
}

export function normalizeCodec(codec?: string | null): string | null {
  if (!codec) return null;
  const c = codec.toLowerCase();
  if (c.includes("eac3") || c === "e-ac3") return "eac3";
  if (c.includes("truehd")) return "truehd";
  if (c.includes("ac3") || c === "ac-3") return "ac3";
  if (c.includes("dts-hd") || c.includes("dtshd")) return "dts-hd";
  if (c.includes("dts:x") || c.includes("dtsx")) return "dts-hd";
  if (c.includes("dts")) return "dts";
  if (c.includes("aac")) return "aac";
  if (c.includes("flac")) return "flac";
  if (c.includes("opus")) return "opus";
  if (c.includes("pcm")) return "pcm";
  if (c.includes("mp3")) return "mp3";
  return c;
}

export function detectAudioProfile(
  codec: string | null,
  channelLayout: string | null,
  streamTitle?: string | null,
  tags?: Record<string, string>,
): string | null {
  const haystack = [streamTitle, tags?.title, tags?.handler_name]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (codec === "truehd" || codec === "eac3") {
    if (haystack.includes("atmos")) return "Atmos";
    if (
      codec === "truehd" &&
      (channelLayout === "7.1" || channelLayout === "7.1(wide)")
    ) {
      return "Atmos";
    }
    return null;
  }

  if (codec === "dts-hd") {
    if (haystack.includes("dts:x") || haystack.includes("dtsx")) return "DTS:X MA";
    if (haystack.includes("hd ma") || haystack.includes("hdma")) return "HD MA";
    if (haystack.includes("hd hra") || haystack.includes("hdtshra"))
      return "HD HRA";
    if (haystack.includes(" ma")) return "HD MA";
    return null;
  }

  if (codec === "dts") {
    if (haystack.includes("es matrix")) return "ES Matrix";
    if (haystack.includes("dts-es") || haystack.includes(" es")) return "ES";
    return null;
  }

  if (codec === "ac3") {
    if (haystack.includes(" ex") || haystack.includes("digital ex")) return "EX";
    return null;
  }

  return null;
}
