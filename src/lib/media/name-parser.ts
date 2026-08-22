import { normalizeTitleSlash } from "@/lib/shared/text-normalize";

const QUALITY_TAGS =
  /\b(2160p|1080p|720p|480p|4k|uhd|hd|sd|x264|x265|h\.?264|h\.?265|hevc|avc|xvid|divx|web-?dl|webrip|bluray|blu-?ray|bdrip|brrip|remux|hybrid|repack|proper|extended|unrated|directors?.cut|imax|10bit|8bit|hdr10\+?|dolby.?vision|dv|hlg|sdr|aac|ac3|eac3|dts|truehd|atmos|multi|dual|rus|eng|sub|dub|rip|cam|ts|tc|scr|r5|dvdrip|hdtv|amzn|nf|dsnp|hmax|atvp|repack2|internal|limited|fs|ws|proper|read\.nfo|xxx|xxx1080p)\b/gi;

const YEAR_PATTERN = /(?:\(|\[|\s|^)(19\d{2}|20\d{2})(?:\)|\]|\s|$)/;

export interface ParsedName {
  title: string;
  year: number | null;
  releaseType: string | null;
  partNumber: number | null;
  partTotal: number | null;
}

/** Series/part markers in release file names (multi-part films, not TV seasons). */
const PART_MARKER_PATTERNS: RegExp[] = [
  /(?:^|[\s._-])(?:серия|сер\.?)\s*(\d{1,2})(?=[\s._-]|$)/iu,
  /(?:^|[\s._-])(\d{1,2})\s*(?:серия|сер\.?)(?=[\s._-]|$)/iu,
  /(?:^|[\s._-])(?:часть|ч\.?)\s*(\d{1,2})(?=[\s._-]|$)/iu,
  /(?:^|[\s._-])(\d{1,2})\s*(?:часть|ч\.?)(?=[\s._-]|$)/iu,
  /(?:^|[\s._-])(?:episode|ep\.?)\s*(\d{1,2})(?=[\s._-]|$)/iu,
  /(?:^|[\s._-])ep\s*(\d{1,2})(?=[\s._-]|$)/iu,
  /(?:^|[\s._-])part\s*(\d{1,2})(?=[\s._-]|$)/iu,
];

const PART_TOTAL_PATTERN =
  /(?:^|[\s._-])(\d{1,2})\s*(?:из|of)\s*(\d{1,2})(?=[\s._-]|$)/iu;

export function stripPartMarkers(raw: string): {
  text: string;
  partNumber: number | null;
  partTotal: number | null;
} {
  let text = raw;
  let partNumber: number | null = null;
  let partTotal: number | null = null;

  const totalMatch = PART_TOTAL_PATTERN.exec(text);
  if (totalMatch) {
    partNumber = parseInt(totalMatch[1], 10);
    partTotal = parseInt(totalMatch[2], 10);
    text = text.replace(totalMatch[0], " ");
  }

  if (partNumber == null) {
    for (const pattern of PART_MARKER_PATTERNS) {
      const m = pattern.exec(text);
      if (!m) continue;
      partNumber = parseInt(m[1], 10);
      text = text.replace(m[0], " ");
      break;
    }
  }

  return { text, partNumber, partTotal };
}

const RELEASE_PATTERNS: [RegExp, string][] = [
  [/\bhybrid\b/i, "hybrid"],
  [/\bbdremux\b/i, "bdremux"],
  [/\bbdrip\b/i, "bdrip"],
  [/\bbrrip\b/i, "bdrip"],
  [/\bblu-?ray\b/i, "bluray"],
  [/\bweb-?dl\b/i, "web-dl"],
  [/\bwebrip\b/i, "webrip"],
  [/\bhdtv(rip)?\b/i, "hdtvrip"],
  [/\bdvdremux\b/i, "dvdremux"],
  [/\bdvdrip\b/i, "dvdrip"],
  [/\bremux\b/i, "bdremux"],
  [/\bcam\b/i, "cam"],
  [/\b(ts|telecine)\b/i, "ts"],
  [/\btc\b/i, "tc"],
  [/\bscr\b/i, "scr"],
];

export function parseReleaseType(raw: string): string | null {
  for (const [pattern, value] of RELEASE_PATTERNS) {
    if (pattern.test(raw)) return value;
  }
  return null;
}

function cleanName(raw: string): string {
  const { text: withoutPart } = stripPartMarkers(raw);

  let name = withoutPart
    .replace(/[._]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  name = name.replace(QUALITY_TAGS, " ");
  name = name.replace(YEAR_PATTERN, " ");
  name = name.replace(/[[\](){}]/g, " ");
  name = name.replace(/\s+/g, " ").trim();

  return normalizeTitleSlash(name || raw.trim());
}

function extractYear(raw: string): number | null {
  const match = raw.match(YEAR_PATTERN);
  if (!match) return null;
  const year = parseInt(match[1], 10);
  if (year >= 1900 && year <= 2100) return year;
  return null;
}

function extractPartFromRaw(raw: string): {
  partNumber: number | null;
  partTotal: number | null;
} {
  return stripPartMarkers(raw.replace(/[._]/g, " "));
}

function scoreName(name: string): number {
  let score = name.length;
  if (YEAR_PATTERN.test(name)) score += 10;
  if (QUALITY_TAGS.test(name)) score -= 20;
  if (name.split(" ").length <= 8) score += 5;
  if (stripPartMarkers(name).partNumber != null) score += 8;
  return score;
}

export function parseMovieName(
  fileName: string,
  parentFolder?: string,
): ParsedName {
  const baseName = fileName.replace(/\.[^.]+$/, "");
  const candidates = [baseName];
  if (parentFolder && parentFolder !== "." && parentFolder !== "..") {
    candidates.push(parentFolder);
  }

  const scored = candidates
    .map((c) => ({
      raw: c,
      cleaned: cleanName(c),
      year: extractYear(c),
      ...extractPartFromRaw(c),
    }))
    .sort((a, b) => scoreName(b.raw) - scoreName(a.raw));

  const best = scored[0];
  const releaseSource = [baseName, parentFolder ?? ""].join(" ");
  const basePart = extractPartFromRaw(baseName);
  return {
    title: best.cleaned || baseName,
    year: best.year ?? extractYear(baseName) ?? extractYear(parentFolder ?? ""),
    releaseType: parseReleaseType(releaseSource),
    partNumber: best.partNumber ?? basePart.partNumber,
    partTotal: best.partTotal ?? basePart.partTotal,
  };
}

/** Parse title/year/release from a full file path. */
export function parseMoviePath(filePath: string): ParsedName {
  const segments = filePath.replace(/\\/g, "/").split("/").filter(Boolean);
  const fileName = segments[segments.length - 1] ?? filePath;
  const parentFolder =
    segments.length > 1 ? segments[segments.length - 2] : undefined;
  return parseMovieName(fileName, parentFolder);
}
