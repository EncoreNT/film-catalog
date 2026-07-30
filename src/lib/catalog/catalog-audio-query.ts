import type { Prisma } from "@/generated/prisma/client";
import { RUS_AUDIO_FORMATS } from "@/lib/catalog/russian-audio-formats";
import {
  premiumOriginalSpatialAudioTrackWhere,
  premiumRussianAtmosAudioTrackWhere,
} from "@/lib/media/quality-predicates";

export interface CatalogListAudioFields {
  // Legacy (kept for back-compat, mapped in normalize).
  audioScope?: string;
  audioChannels?: string;
  audioFormat?: string;
  audioTranslation?: string;
  premiumAudio?: string;
  hasRus?: string;
  hasOrig?: string;
  rusChannels?: string;
  rusFormat?: string;
  rusTranslation?: string;
  origChannels?: string;
  origFormat?: string;
  premiumRus?: string;
  premiumOrig?: string;
  // New flat model.
  hasLang?: string;
  channels?: string;
  codec?: string;
  translation?: string;
}

export interface NormalizedCatalogAudioQuery {
  /** Languages that must ALL be present on the release (AND). */
  languages: string[];
  /** Channels: movie has >=1 track with any of these (OR). */
  channels: string[];
  /** Codecs: movie has >=1 track with any of these (OR). */
  codecs: string[];
  /** Translation types: movie has >=1 track with any of these (OR). */
  translations: string[];
  /** Movie has >=1 premium (Atmos/DTS:X) track. */
  premium: boolean;
}

function splitCsv(value: string | undefined): string[] {
  return value?.split(",").filter(Boolean) ?? [];
}

function formatWhereClauses(
  formatValues: string[],
): Prisma.AudioTrackWhereInput[] {
  return formatValues
    .map((v) => RUS_AUDIO_FORMATS.find((f) => f.value === v)?.where)
    .filter((w): w is Prisma.AudioTrackWhereInput => Boolean(w));
}

/**
 * Maps legacy scoped params + new flat params into a single normalized view.
 * Legacy `hasRus`/`hasOrig`/`audioScope` are translated into `languages`.
 */
export function normalizeCatalogAudioQuery(
  query: CatalogListAudioFields,
): NormalizedCatalogAudioQuery {
  // Treat "original" in hasLang as the original-presence sentinel.
  const rawLangs = splitCsv(query.hasLang).map((l) =>
    l === "original" ? "__original__" : l,
  );
  let languages = rawLangs;
  const channels = splitCsv(query.channels);
  const codecs = splitCsv(query.codec);
  const translations = splitCsv(query.translation);
  let premium = false;

  // New premium toggle (any language).
  if (query.premiumAudio === "true" && !query.audioScope && !query.premiumRus && !query.premiumOrig) {
    premium = true;
  }

  // Legacy: hasRus / hasOrig toggles → languages presence.
  if (query.hasRus === "1" && !languages.includes("rus")) languages.push("rus");
  if (query.hasOrig === "1" && !languages.includes("original")) {
    // "original" is a translationType, not a language; handled below as a
    // special presence filter. We mark it via a sentinel language value.
    languages.push("__original__");
  }

  // Legacy: scoped track params → fold into the flat OR lists.
  const rusChannels = splitCsv(query.rusChannels);
  const origChannels = splitCsv(query.origChannels);
  const rusFormats = splitCsv(query.rusFormat);
  const origFormats = splitCsv(query.origFormat);
  const rusTranslations = splitCsv(query.rusTranslation);
  for (const c of rusChannels) if (!channels.includes(c)) channels.push(c);
  for (const c of origChannels) if (!channels.includes(c)) channels.push(c);
  for (const f of rusFormats) if (!codecs.includes(f)) codecs.push(f);
  for (const f of origFormats) if (!codecs.includes(f)) codecs.push(f);
  for (const t of rusTranslations) if (!translations.includes(t)) translations.push(t);

  // Legacy: audioScope + shared params → map into languages + flat lists.
  const legacyScope = query.audioScope === "original" ? "original" : "rus";
  const legacyChannels = splitCsv(query.audioChannels);
  const legacyFormats = splitCsv(query.audioFormat);
  const legacyTranslations = splitCsv(query.audioTranslation);
  const hasLegacyTrackFilters =
    legacyChannels.length > 0 ||
    legacyFormats.length > 0 ||
    legacyTranslations.length > 0;
  const hasScopedTrackFilters =
    channels.length > 0 || codecs.length > 0 || translations.length > 0;

  if (hasLegacyTrackFilters && !hasScopedTrackFilters) {
    if (legacyScope === "original") {
      if (!languages.includes("__original__")) languages.push("__original__");
      for (const c of legacyChannels) if (!channels.includes(c)) channels.push(c);
      for (const f of legacyFormats) if (!codecs.includes(f)) codecs.push(f);
    } else {
      if (!languages.includes("rus")) languages.push("rus");
      for (const c of legacyChannels) if (!channels.includes(c)) channels.push(c);
      for (const f of legacyFormats) if (!codecs.includes(f)) codecs.push(f);
      for (const t of legacyTranslations) if (!translations.includes(t)) translations.push(t);
    }
  }

  // Legacy premium: premiumAudio + audioScope → premium for that scope.
  if (query.premiumAudio === "true" && (query.audioScope || query.premiumRus || query.premiumOrig)) {
    premium = true;
    if (legacyScope === "original" && !languages.includes("__original__")) {
      languages.push("__original__");
    } else if (legacyScope === "rus" && !languages.includes("rus")) {
      languages.push("rus");
    }
  }
  if (query.premiumRus === "true") {
    premium = true;
    if (!languages.includes("rus")) languages.push("rus");
  }
  if (query.premiumOrig === "true") {
    premium = true;
    if (!languages.includes("__original__")) languages.push("__original__");
  }

  return { languages, channels, codecs, translations, premium };
}

/** Release-level audio filters (AND between them). */
export function buildCatalogAudioReleaseFilters(
  query: CatalogListAudioFields,
): Prisma.ReleaseWhereInput[] {
  const n = normalizeCatalogAudioQuery(query);
  const filters: Prisma.ReleaseWhereInput[] = [];

  // Language presence: one filter per language (AND between languages).
  for (const lang of n.languages) {
    if (lang === "__original__") {
      filters.push({
        audioTracks: { some: { translationType: "original" } },
      });
    } else {
      filters.push({
        audioTracks: { some: { language: lang } },
      });
    }
  }

  // Channels: any track with these layouts (OR within).
  if (n.channels.length > 0) {
    filters.push({
      audioTracks: { some: { channelLayout: { in: n.channels } } },
    });
  }

  // Codecs: any track with these codecs (OR within).
  const formatWhere = formatWhereClauses(n.codecs);
  if (formatWhere.length > 0) {
    filters.push({
      audioTracks: { some: { OR: formatWhere } },
    });
  }

  // Translation types: any track (OR within).
  if (n.translations.length > 0) {
    filters.push({
      audioTracks: { some: { translationType: { in: n.translations } } },
    });
  }

  // Premium: any Atmos/DTS:X track (russian or original).
  if (n.premium) {
    filters.push({
      audioTracks: {
        some: {
          OR: [
            premiumRussianAtmosAudioTrackWhere,
            premiumOriginalSpatialAudioTrackWhere,
          ],
        },
      },
    });
  }

  return filters;
}
