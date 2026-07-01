export interface DictOption {
  value: string;
  label: string;
}

export const VIDEO_CODECS: DictOption[] = [
  { value: "hevc", label: "HEVC / H.265" },
  { value: "h264", label: "H.264 / AVC" },
  { value: "av1", label: "AV1" },
  { value: "vp9", label: "VP9" },
  { value: "vp8", label: "VP8" },
  { value: "mpeg2", label: "MPEG-2" },
  { value: "vc1", label: "VC-1" },
  { value: "mpeg4", label: "MPEG-4" },
  { value: "theora", label: "Theora" },
];

export const AUDIO_CODECS: DictOption[] = [
  { value: "truehd", label: "Dolby TrueHD" },
  { value: "eac3", label: "E-AC-3 / Dolby Digital Plus" },
  { value: "ac3", label: "AC-3 / Dolby Digital" },
  { value: "dts-hd", label: "DTS-HD" },
  { value: "dts", label: "DTS" },
  { value: "aac", label: "AAC" },
  { value: "flac", label: "FLAC" },
  { value: "opus", label: "Opus" },
  { value: "vorbis", label: "Vorbis" },
  { value: "pcm", label: "PCM / LPCM" },
  { value: "mp3", label: "MP3" },
];

/** Profile options per audio codec (dependent select). */
export const AUDIO_PROFILES_BY_CODEC: Record<string, DictOption[]> = {
  truehd: [
    { value: "Atmos", label: "Dolby Atmos" },
    { value: "None", label: "Без профиля" },
  ],
  eac3: [
    { value: "Atmos", label: "Dolby Atmos" },
    { value: "None", label: "Без профиля" },
  ],
  ac3: [
    { value: "EX", label: "Dolby Digital EX" },
    { value: "None", label: "Без профиля" },
  ],
  "dts-hd": [
    { value: "HD MA", label: "DTS-HD Master Audio" },
    { value: "DTS:X MA", label: "DTS:X (поверх HD MA)" },
    { value: "HD HRA", label: "DTS-HD High Resolution" },
    { value: "None", label: "Без профиля" },
  ],
  dts: [
    { value: "ES", label: "DTS-ES" },
    { value: "ES Matrix", label: "DTS-ES Matrix" },
    { value: "None", label: "Без профиля" },
  ],
  aac: [{ value: "None", label: "Без профиля" }],
  flac: [{ value: "None", label: "Без профиля" }],
  opus: [{ value: "None", label: "Без профиля" }],
  vorbis: [{ value: "None", label: "Без профиля" }],
  pcm: [{ value: "None", label: "Без профиля" }],
  mp3: [{ value: "None", label: "Без профиля" }],
};

export function getAudioProfilesForCodec(codec: string): DictOption[] {
  if (!codec) {
    return [{ value: "None", label: "Без профиля" }];
  }
  return (
    AUDIO_PROFILES_BY_CODEC[codec] ?? [
      { value: "None", label: "Без профиля" },
    ]
  );
}

export function normalizeAudioProfile(
  codec: string,
  profile: string | null | undefined,
): string {
  const options = getAudioProfilesForCodec(codec);
  const values = options.map((o) => o.value);
  if (!profile || profile === "None") return "None";
  if (values.includes(profile)) return profile;
  return "None";
}

export const CHANNEL_LAYOUTS: DictOption[] = [
  { value: "1.0", label: "1.0 (моно)" },
  { value: "2.0", label: "2.0 (стерео)" },
  { value: "2.1", label: "2.1" },
  { value: "3.0", label: "3.0" },
  { value: "4.0", label: "4.0" },
  { value: "5.0", label: "5.0" },
  { value: "5.1", label: "5.1" },
  { value: "6.1", label: "6.1" },
  { value: "7.1", label: "7.1" },
  { value: "other", label: "Другое" },
];

/** Base HDR formats (first-level select). */
export const HDR_BASE_FORMATS: DictOption[] = [
  { value: "HDR10", label: "HDR10" },
  { value: "HDR10+", label: "HDR10+" },
  { value: "DolbyVision", label: "Dolby Vision" },
  { value: "HLG", label: "HLG" },
];

/** Dolby Vision profiles (second-level select, shown when base is DolbyVision). */
export const DOLBY_VISION_PROFILES: DictOption[] = [
  { value: "", label: "Без профиля" },
  { value: "P5", label: "Profile 5 (IPTPQc2)" },
  { value: "P7", label: "Profile 7 (MEL)" },
  { value: "P7FEL", label: "Profile 7 (FEL)" },
  { value: "P8", label: "Profile 8.1 (HDR10 base)" },
  { value: "P8.1", label: "Profile 8.1" },
  { value: "P8.4", label: "Profile 8.4 (HLG base)" },
];

const DV_PREFIX = "DV:";
const DV_BASE = "DolbyVision";

export function buildHdrValue(base: string, dvProfile: string): string {
  if (base === DV_BASE && dvProfile) {
    return `${DV_PREFIX}${dvProfile}`;
  }
  return base;
}

export function parseHdrValue(value: string | null | undefined): {
  base: string;
  dvProfile: string;
} {
  if (!value || value === "SDR") return { base: "SDR", dvProfile: "" };
  if (value.startsWith(DV_PREFIX)) {
    return { base: DV_BASE, dvProfile: value.slice(DV_PREFIX.length) };
  }
  return { base: value, dvProfile: "" };
}

export function formatHdrLabel(value: string | null | undefined): string | null {
  if (!value || value === "SDR") return null;
  const { base, dvProfile } = parseHdrValue(value);
  if (base === DV_BASE) {
    return dvProfile
      ? `Dolby Vision ${dvProfile}`
      : "Dolby Vision";
  }
  return dictLabel(HDR_BASE_FORMATS, base) ?? base;
}

export const SUBTITLE_TYPES: DictOption[] = [
  { value: "SRT", label: "SRT (текст)" },
  { value: "ASS", label: "ASS/SSA (стили)" },
  { value: "WebVTT", label: "WebVTT" },
  { value: "PGS", label: "PGS (графика, Blu-ray)" },
  { value: "VobSub", label: "VobSub (графика, DVD)" },
  { value: "MP4 Text", label: "MP4 Text" },
  { value: "HDMV Text", label: "HDMV Text" },
];

export const LANGUAGES: DictOption[] = [
  { value: "rus", label: "Русский" },
  { value: "eng", label: "Английский" },
  { value: "ukr", label: "Украинский" },
  { value: "fre", label: "Французский" },
  { value: "ger", label: "Немецкий" },
  { value: "spa", label: "Испанский" },
  { value: "ita", label: "Итальянский" },
  { value: "por", label: "Португальский" },
  { value: "pol", label: "Польский" },
  { value: "cze", label: "Чешский" },
  { value: "hun", label: "Венгерский" },
  { value: "dan", label: "Датский" },
  { value: "swe", label: "Шведский" },
  { value: "nor", label: "Норвежский" },
  { value: "fin", label: "Финский" },
  { value: "jpn", label: "Японский" },
  { value: "kor", label: "Корейский" },
  { value: "chi", label: "Китайский" },
  { value: "tur", label: "Турецкий" },
  { value: "ara", label: "Арабский" },
  { value: "und", label: "Неизвестный" },
];

export const RESOLUTIONS: DictOption[] = [
  { value: "4K", label: "4K (2160p)" },
  { value: "1080p", label: "Full HD (1080p)" },
  { value: "720p", label: "HD (720p)" },
  { value: "480p", label: "SD (480p)" },
  { value: "other", label: "Другое" },
];

/** Reference pixel sizes when user picks a resolution label. */
export const RESOLUTION_REFERENCE_PX: Record<
  string,
  { width: number; height: number }
> = {
  "4K": { width: 3840, height: 2160 },
  "1080p": { width: 1920, height: 1080 },
  "720p": { width: 1280, height: 720 },
  "480p": { width: 854, height: 480 },
};

export const RELEASE_TYPES: DictOption[] = [
  { value: "hybrid", label: "Hybrid" },
  { value: "bdremux", label: "BDRemux" },
  { value: "bdrip", label: "BDRip" },
  { value: "bluray", label: "Blu-ray (untouched)" },
  { value: "web-dl", label: "WEB-DL" },
  { value: "webrip", label: "WEBRip" },
  { value: "hdtvrip", label: "HDTVRip" },
  { value: "dvdrip", label: "DVDRip" },
  { value: "dvdremux", label: "DVDRemux" },
  { value: "cam", label: "CAM" },
  { value: "ts", label: "TS" },
  { value: "tc", label: "TC" },
  { value: "scr", label: "SCR" },
  { value: "other", label: "Другое" },
];

/**
 * Cinematic cut / version of a film — independent of the release source
 * (`releaseType`). "theatrical" is the base version every movie defaults to;
 * it is never shown in the UI. Any other value is surfaced as a badge on the
 * movie page and catalog card.
 */
export const DEFAULT_MOVIE_VERSION = "theatrical";

export const MOVIE_VERSIONS: DictOption[] = [
  { value: "theatrical", label: "Театральная версия" },
  { value: "directors-cut", label: "Режиссёрская версия" },
  { value: "extended", label: "Расширенная версия" },
  { value: "special-edition", label: "Специальная версия" },
  { value: "ultimate-edition", label: "Ультимативная версия" },
  { value: "final-cut", label: "Финальная версия" },
  { value: "uncut", label: "Без купюр" },
  { value: "unrated", label: "Без рейтинга" },
  { value: "collectors-cut", label: "Коллекционная версия" },
  { value: "remastered", label: "Ремастер" },
  { value: "tv-cut", label: "Телевизионная версия" },
  { value: "international", label: "Международная версия" },
  { value: "other", label: "Другое" },
];

/** Raw label for a version value (includes "Театральная версия"). */
export function movieVersionLabel(value?: string | null): string | null {
  if (!value) return null;
  return MOVIE_VERSIONS.find((v) => v.value === value)?.label ?? null;
}

/** The theatrical cut is the base version and is never displayed. */
export function isBaseMovieVersion(value?: string | null): boolean {
  return !value || value === DEFAULT_MOVIE_VERSION;
}

/**
 * Label to display for a version, or null when it's the base theatrical cut
 * (which is hidden everywhere) or an unknown value without a label.
 */
export function displayMovieVersionLabel(
  value?: string | null,
): string | null {
  if (isBaseMovieVersion(value)) return null;
  return movieVersionLabel(value) ?? value ?? null;
}

export const AUDIO_TRANSLATION_TYPES: DictOption[] = [
  { value: "dub", label: "Дубляж" },
  { value: "pro_multi", label: "Проф. многоголосый" },
  { value: "pro_single", label: "Проф. одноголосый" },
  { value: "pro_two", label: "Проф. двухголосый" },
  { value: "amateur_multi", label: "Люб. многоголосый" },
  { value: "amateur_single", label: "Люб. одноголосый" },
  { value: "author", label: "Авторский" },
  { value: "commentary", label: "С комментариями" },
  { value: "original", label: "Оригинал" },
];

export const GENRES: DictOption[] = [
  { value: "action", label: "Боевик" },
  { value: "adventure", label: "Приключения" },
  { value: "animation", label: "Анимация" },
  { value: "anime", label: "Аниме" },
  { value: "biography", label: "Биография" },
  { value: "comedy", label: "Комедия" },
  { value: "crime", label: "Криминал" },
  { value: "documentary", label: "Документальный" },
  { value: "drama", label: "Драма" },
  { value: "family", label: "Семейный" },
  { value: "fantasy", label: "Фэнтези" },
  { value: "history", label: "История" },
  { value: "horror", label: "Ужасы" },
  { value: "mysticism", label: "Мистика" },
  { value: "music", label: "Музыка" },
  { value: "musical", label: "Мюзикл" },
  { value: "mystery", label: "Детектив" },
  { value: "romance", label: "Мелодрама" },
  { value: "sci-fi", label: "Фантастика" },
  { value: "sport", label: "Спорт" },
  { value: "thriller", label: "Триллер" },
  { value: "war", label: "Военный" },
  { value: "western", label: "Вестерн" },
];

export function genreLabel(name?: string | null): string | null {
  if (!name) return null;
  return GENRES.find((g) => g.value === name)?.label ?? name;
}

export function dictLabel(
  dict: DictOption[],
  value?: string | null,
): string | null {
  if (!value) return null;
  return dict.find((o) => o.value === value)?.label ?? value;
}
