const QUALITY_TAGS =
  /\b(2160p|1080p|720p|480p|4k|uhd|hd|sd|x264|x265|h\.?264|h\.?265|hevc|avc|xvid|divx|web-?dl|webrip|bluray|blu-?ray|bdrip|brrip|remux|hybrid|repack|proper|extended|unrated|directors?.cut|imax|10bit|8bit|hdr10\+?|dolby.?vision|dv|hlg|sdr|aac|ac3|eac3|dts|truehd|atmos|multi|dual|rus|eng|sub|dub|rip|cam|ts|tc|scr|r5|dvdrip|hdtv|amzn|nf|dsnp|hmax|atvp|repack2|internal|limited|fs|ws|proper|read\.nfo|xxx|xxx1080p)\b/gi;

const YEAR_PATTERN = /(?:\(|\[|\s|^)(19\d{2}|20\d{2})(?:\)|\]|\s|$)/;

export interface ParsedName {
  title: string;
  year: number | null;
  releaseType: string | null;
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
  let name = raw
    .replace(/[._]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  name = name.replace(QUALITY_TAGS, " ");
  name = name.replace(YEAR_PATTERN, " ");
  name = name.replace(/[[\](){}]/g, " ");
  name = name.replace(/\s+/g, " ").trim();

  return name || raw.trim();
}

function extractYear(raw: string): number | null {
  const match = raw.match(YEAR_PATTERN);
  if (!match) return null;
  const year = parseInt(match[1], 10);
  if (year >= 1900 && year <= 2100) return year;
  return null;
}

function scoreName(name: string): number {
  let score = name.length;
  if (YEAR_PATTERN.test(name)) score += 10;
  if (QUALITY_TAGS.test(name)) score -= 20;
  if (name.split(" ").length <= 8) score += 5;
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
    .map((c) => ({ raw: c, cleaned: cleanName(c), year: extractYear(c) }))
    .sort((a, b) => scoreName(b.raw) - scoreName(a.raw));

  const best = scored[0];
  const releaseSource = [baseName, parentFolder ?? ""].join(" ");
  return {
    title: best.cleaned || baseName,
    year: best.year ?? extractYear(baseName) ?? extractYear(parentFolder ?? ""),
    releaseType: parseReleaseType(releaseSource),
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
