"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ChevronDown, SlidersHorizontal, X } from "lucide-react";
import { FilterPanel } from "./FilterBar";
import { CLEAR_ALL_FILTER_PARAMS, countActiveFilters, parseMulti, toggleMulti, type FilterBarFacets } from "@/lib/catalog/filter-bar-utils";

import { AUDIO_TRANSLATION_TYPES, LANGUAGES, displayGenreName } from "@/lib/shared/dictionaries";
import { RUS_AUDIO_FORMATS } from "@/lib/catalog/russian-audio-formats";

const FILTER_LABELS: Record<string, string> = {
  q: "Поиск", genre: "Жанр", resolution: "Разрешение", hdr: "HDR",
  hasLang: "Язык", channels: "Каналы", codec: "Кодек", translation: "Перевод",
  watched: "Просмотр", minRating: "Оценка", multiRelease: "Несколько релизов",
  emptyReleases: "Без релизов", tvReady: "Для телевизора", premiumAudio: "Atmos / DTS:X",
};
function filterValueLabel(key: string, value: string): string {
  if (key === "genre") return displayGenreName(value);
  if (key === "hasLang") return value === "original" ? "Оригинальная дорожка" : LANGUAGES.find((x) => x.value === value)?.label ?? value;
  if (key === "translation") return AUDIO_TRANSLATION_TYPES.find((x) => x.value === value)?.label ?? value;
  if (key === "codec") return RUS_AUDIO_FORMATS.find((x) => x.value === value)?.label ?? value;
  if (key === "hdr" && value === "HDR_ANY") return "Любой HDR";
  if (key === "watched") return value === "watched" ? "Просмотренные" : "Непросмотренные";
  if (key === "minRating") return `Оценка ${value}+`;
  if (value === "true") return FILTER_LABELS[key];
  return value;
}

const GROUPS = [
  { key: "genre", label: "Жанр", params: ["genre"] },
  { key: "image", label: "Изображение", params: ["resolution", "hdr"] },
  { key: "audio", label: "Звук", params: ["hasLang", "channels", "codec", "premiumAudio", "tvReady"] },
  { key: "translation", label: "Перевод", params: ["translation"] },
  { key: "all", label: "Все фильтры", params: [] },
] as const;
type Group = typeof GROUPS[number]["key"];

export function FilterMenus({ facets, updateParams }: {
  facets: FilterBarFacets;
  updateParams: (updates: Record<string, string | null>) => void;
}) {
  const params = useSearchParams();
  const [open, setOpen] = useState<Group | null>(null);
  const root = useRef<HTMLDivElement>(null);
  const triggers = useRef<Partial<Record<Group, HTMLButtonElement | null>>>({});
  const activeCount = countActiveFilters(params);
  function closeWithFocus() {
    if (open) triggers.current[open]?.focus();
    setOpen(null);
  }
  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(null);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        triggers.current[open]?.focus();
        setOpen(null);
      }
    };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);
  useLayoutEffect(() => {
    if (!open) return;
    const fitHeight = () => {
      const panel = root.current?.querySelector<HTMLElement>(".catalog-facet-popover");
      const content = panel?.querySelector<HTMLElement>(".catalog-facet-content");
      if (!panel || !content) return;
      panel.style.top = "";
      panel.style.bottom = "";
      const panelTop = panel.getBoundingClientRect().top;
      const chromeHeight = content.getBoundingClientRect().top - panelTop + 18;
      let available = window.innerHeight - panelTop - 16;
      const anchorTop = panel.offsetParent?.getBoundingClientRect().top ?? 0;
      // Flip above the trigger on short desktop/tablet windows. Mobile panels
      // already have a fixed viewport position and only need a height limit.
      if (getComputedStyle(panel).position === "absolute" && available < 240 && anchorTop - 24 > available) {
        panel.style.top = "auto";
        panel.style.bottom = "calc(100% + 7px)";
        available = anchorTop - 24;
      }
      content.style.setProperty("--catalog-facet-height", `${Math.max(40, available - chromeHeight)}px`);
    };
    fitHeight();
    window.addEventListener("resize", fitHeight);
    window.addEventListener("scroll", fitHeight, true);
    return () => {
      window.removeEventListener("resize", fitHeight);
      window.removeEventListener("scroll", fitHeight, true);
    };
  }, [open, params]);
  return (
    <div className="catalog-facet-row" ref={root} onBlur={(event) => {
      if (event.relatedTarget && !event.currentTarget.contains(event.relatedTarget as Node)) setOpen(null);
    }}>
      <div className="catalog-facet-menus">
        {GROUPS.map((group) => {
          const count = group.params.filter((key) => params.has(key)).length;
          return (
            <div className={`catalog-facet-menu ${group.key === "all" ? "catalog-facet-menu--all" : ""}`} key={group.key}>
              <button type="button" className="catalog-menu-trigger focus-ring" ref={(node) => { triggers.current[group.key] = node; }} aria-expanded={open === group.key} aria-controls={`catalog-facets-${group.key}`} onClick={() => setOpen(open === group.key ? null : group.key)}>
                {group.key === "all" ? <SlidersHorizontal aria-hidden /> : null}{group.label}{count > 0 ? <span className="catalog-menu-count">{count}</span> : null}<ChevronDown aria-hidden />
              </button>
              {open === group.key ? <div id={`catalog-facets-${group.key}`} className="catalog-facet-popover" role="region" aria-label={group.label}>
                <FilterPanel facets={facets} anyFacets group={group.key} updateParams={updateParams} onClose={closeWithFocus} />
              </div> : null}
            </div>
          );
        })}
      </div>
      {activeCount > 0 ? <button type="button" className="catalog-reset focus-ring" onClick={() => updateParams(CLEAR_ALL_FILTER_PARAMS)}><X aria-hidden />Сбросить фильтры · {activeCount}</button> : null}
      <div className="catalog-active-filters">
        {Object.keys(FILTER_LABELS).flatMap((key) => {
          const raw = params.get(key);
          if (!raw || (key === "watched" && raw === "all")) return [];
          const multi = ["genre", "resolution", "hdr", "hasLang", "channels", "codec", "translation"].includes(key);
          return (multi ? parseMulti(raw) : [raw]).map((value) => {
            const label = filterValueLabel(key, value);
            return <button type="button" key={`${key}:${value}`} className="focus-ring" title={`${FILTER_LABELS[key]}: ${label}`} aria-label={`Убрать фильтр: ${label}`} onClick={() => updateParams({ [key]: multi ? toggleMulti(parseMulti(raw), value).join(",") || null : null })}><span>{label}</span><X aria-hidden /></button>;
          });
        })}
      </div>
    </div>
  );
}
