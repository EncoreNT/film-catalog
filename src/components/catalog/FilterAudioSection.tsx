"use client";

import { useMemo } from "react";
import { MonitorPlay, Sparkles, Waves } from "lucide-react";
import { Chip } from "@/components/primitives/Chip";
import {
  AUDIO_TRANSLATION_TYPES,
  LANGUAGES,
  CHANNEL_LAYOUTS,
} from "@/lib/shared/dictionaries";
import { RUS_AUDIO_FORMATS } from "@/lib/catalog/russian-audio-formats";
import { tvReadyFilterChipLabel } from "@/lib/media/tv-ready";
import {
  facetCountMap,
  hasFacets,
  parseMulti,
  sortByDict,
  toggleMulti,
  type FilterBarFacets,
} from "@/lib/catalog/filter-bar-utils";
import {
  QualityLadder,
  translationLabel,
} from "@/components/catalog/FilterFacetParts";

type UpdateParams = (updates: Record<string, string | null>) => void;

/** Language presence chips (AND between selections). */
const LANGUAGE_PRESENCE: { value: string; label: string }[] = [
  { value: "rus", label: "Русская" },
  { value: "original", label: "Оригинал" },
];

export function FilterAudioSection({
  facets,
  searchParams,
  updateParams,
}: {
  facets: FilterBarFacets;
  searchParams: URLSearchParams;
  updateParams: UpdateParams;
}) {
  const activeLangs = useMemo(
    () => parseMulti(searchParams.get("hasLang")),
    [searchParams],
  );
  const activeChannels = useMemo(
    () => parseMulti(searchParams.get("channels")),
    [searchParams],
  );
  const activeCodecs = useMemo(
    () => parseMulti(searchParams.get("codec")),
    [searchParams],
  );
  const activeTranslations = useMemo(
    () => parseMulti(searchParams.get("translation")),
    [searchParams],
  );
  const premiumActive = searchParams.get("premiumAudio") === "true";
  const tvReadyActive = searchParams.get("tvReady") === "true";

  const channelFacets = facets.channelLayouts;
  const codecFacets = facets.audioFormats;
  const translationFacets = facets.translationTypes;

  const showChannels = hasFacets(channelFacets);
  const showCodecs = codecFacets.some((f) => f.count > 0);
  const showTranslations = hasFacets(translationFacets);

  // Extra language chips beyond rus/original, derived from facet data.
  // Only show languages with a meaningful presence to keep the row compact.
  const EXTRA_LANG_MIN_COUNT = 5;
  const extraLangOptions = useMemo(() => {
    const counts = facetCountMap(facets.languages);
    const known = new Set(LANGUAGE_PRESENCE.map((l) => l.value));
    return sortByDict(
      facets.languages.filter(
        (f) => f.value && !known.has(f.value) && f.count >= EXTRA_LANG_MIN_COUNT,
      ),
      LANGUAGES,
    ).map((f) => ({
      value: f.value!,
      label: LANGUAGES.find((l) => l.value === f.value)?.label ?? f.value!,
      count: counts.get(f.value!) ?? 0,
    }));
  }, [facets.languages]);

  const channelOptions = useMemo(
    () =>
      sortByDict(channelFacets, CHANNEL_LAYOUTS).map((f) => ({
        value: f.value!,
        label: f.value!,
      })),
    [channelFacets],
  );
  const codecOptions = useMemo(() => {
    const counts = facetCountMap(codecFacets);
    return RUS_AUDIO_FORMATS.filter(
      (f) => (counts.get(f.value) ?? 0) > 0,
    ).map((f) => ({ value: f.value, label: f.label }));
  }, [codecFacets]);
  const translationOptions = useMemo(
    () =>
      sortByDict(translationFacets, AUDIO_TRANSLATION_TYPES)
        .filter((f) => f.value !== "original")
        .map((f) => ({ value: f.value!, count: f.count })),
    [translationFacets],
  );

  const showAudio =
    showChannels || showCodecs || showTranslations || extraLangOptions.length > 0;

  if (!showAudio) return null;

  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2">
        <Waves className="h-3.5 w-3.5 text-accent/80" aria-hidden />
        <h3 className="font-mono-tech text-faint">звук</h3>
      </div>

      {/* Language presence (AND between selections). */}
      <div className="space-y-1.5">
        <div className="flex flex-wrap gap-1.5">
          {LANGUAGE_PRESENCE.map((lang) => (
            <Chip
              key={lang.value}
              size="sm"
              active={activeLangs.includes(lang.value)}
              onClick={() =>
                updateParams({
                  hasLang: toggleMulti(activeLangs, lang.value).join(",") || null,
                })
              }
            >
              {lang.label}
            </Chip>
          ))}
          {extraLangOptions.map((lang) => (
            <Chip
              key={lang.value}
              size="sm"
              active={activeLangs.includes(lang.value)}
              count={lang.count}
              onClick={() =>
                updateParams({
                  hasLang: toggleMulti(activeLangs, lang.value).join(",") || null,
                })
              }
            >
              {lang.label}
            </Chip>
          ))}
        </div>
      </div>

      {/* Channels (OR within — any track). */}
      {showChannels ? (
        <div className="space-y-1.5">
          <QualityLadder
            options={channelOptions}
            active={activeChannels}
            counts={facetCountMap(channelFacets)}
            onToggle={(v) =>
              updateParams({
                channels: toggleMulti(activeChannels, v).join(",") || null,
              })
            }
          />
        </div>
      ) : null}

      {/* Codec (OR within — any track). */}
      {showCodecs ? (
        <div className="space-y-1.5">
          <div className="flex flex-wrap gap-1">
            {codecOptions.map((fmt) => (
              <Chip
                key={fmt.value}
                size="sm"
                active={activeCodecs.includes(fmt.value)}
                count={facetCountMap(codecFacets).get(fmt.value)}
                onClick={() =>
                  updateParams({
                    codec: toggleMulti(activeCodecs, fmt.value).join(",") || null,
                  })
                }
              >
                {fmt.label}
              </Chip>
            ))}
          </div>
        </div>
      ) : null}

      {/* Translation type (OR within — any track). */}
      {showTranslations ? (
        <div className="space-y-1.5">
          <div className="flex flex-wrap gap-1">
            {translationOptions.map((f) => (
              <Chip
                key={f.value}
                size="sm"
                active={activeTranslations.includes(f.value)}
                count={f.count}
                onClick={() =>
                  updateParams({
                    translation:
                      toggleMulti(activeTranslations, f.value).join(",") || null,
                  })
                }
              >
                {translationLabel(f.value)}
              </Chip>
            ))}
          </div>
        </div>
      ) : null}

      {/* Premium + TV-ready. */}
      <div className="flex flex-wrap gap-1.5">
        <Chip
          size="sm"
          active={premiumActive}
          onClick={() =>
            updateParams({ premiumAudio: premiumActive ? null : "true" })
          }
        >
          <Sparkles className="h-3 w-3" aria-hidden />
          Atmos · DTS:X
        </Chip>
        <Chip
          size="sm"
          active={tvReadyActive}
          count={facets.tvReady > 0 ? facets.tvReady : undefined}
          onClick={() =>
            updateParams({ tvReady: tvReadyActive ? null : "true" })
          }
        >
          <MonitorPlay className="h-3 w-3" aria-hidden />
          {tvReadyFilterChipLabel()}
        </Chip>
      </div>
    </section>
  );
}
