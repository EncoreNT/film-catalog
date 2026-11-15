"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowUpRight, HardDrive, Image, ListFilter, ScanLine, SlidersHorizontal, Upload, Users, Wrench } from "lucide-react";
import { FormActionBar } from "@/components/primitives/FormActionBar";
import { Button } from "@/components/primitives/Button";
import { RatersSection } from "@/components/settings/RatersSection";
import { ScannerSection } from "@/components/settings/ScannerSection";
import { CatalogSection } from "@/components/settings/CatalogSection";
import { BuildsSection } from "@/components/settings/BuildsSection";
import { ExportSection } from "@/components/settings/ExportSection";
import { StoragesSection } from "@/components/settings/StoragesSection";
import { PosterQualitySection } from "./PosterQualitySection";
import { SETTINGS_TABS, settingsTab, type SettingsTab } from "./settings-tabs";
import type { StorageOption } from "@/lib/shared/storage-types";
import type { AppSettingsSnapshot } from "@/lib/db/settings";
import { apiFetch } from "@/lib/api/client";
import "./settings.css";

const TAB_ICONS = {
  raters: Users, storages: HardDrive, posters: Image, scanner: ScanLine,
  catalog: ListFilter, builds: SlidersHorizontal, export: Upload,
};

export type RaterView = {
  id: number;
  name: string;
  sortOrder: number;
};

interface SettingsPageClientProps {
  initialRaters: RaterView[];
  initialSettings: AppSettingsSnapshot;
  initialStorages: StorageOption[];
  initialTab: SettingsTab;
}

export function SettingsPageClient({
  initialRaters,
  initialSettings,
  initialStorages,
  initialTab,
}: SettingsPageClientProps) {
  const searchParams = useSearchParams();
  const tab = settingsTab(searchParams.get("tab") ?? initialTab);
  const [storages, setStorages] = useState(initialStorages);
  const [raters, setRaters] = useState(initialRaters);
  const [settings, setSettings] = useState(initialSettings);
  const [draft, setDraft] = useState(initialSettings);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const isDirty = useMemo(
    () => JSON.stringify(draft) !== JSON.stringify(settings),
    [draft, settings],
  );

  useEffect(() => {
    if (!isDirty) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [isDirty]);

  const handleSaveSettings = () => {
    setError(null);
    startTransition(async () => {
      try {
        const saved = await apiFetch<AppSettingsSnapshot>(
          "/api/settings",
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              scanRoot: draft.scanRoot,
              exportTargetDir: draft.exportTargetDir,
              catalogPageSize: draft.catalogPageSize,
              catalogDefaultSort: draft.catalogDefaultSort,
              buildTranscodeConcurrency: draft.buildTranscodeConcurrency,
              defaultAc3Bitrate: draft.defaultAc3Bitrate,
              defaultEac3Bitrate: draft.defaultEac3Bitrate,
            }),
          },
          "Не удалось сохранить настройки",
        );
        setSettings(saved);
        setDraft(saved);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Не удалось сохранить настройки",
        );
      }
    });
  };

  return (
    <div className="settings-page">
      <header className="settings-page-header">
        <h1>Настройки</h1>
        <p>Ваш каталог, диски и обработка файлов.</p>
      </header>

      <div className="settings-layout">
        <aside className="settings-sidebar">
          <div className="settings-mobile-nav">
            <label htmlFor="settings-section-select" className="sr-only">Раздел настроек</label>
            <select id="settings-section-select" value={tab} onChange={(event) => {
              const url = new URL(window.location.href);
              url.searchParams.set("tab", event.target.value);
              window.history.pushState(null, "", url);
            }}>
              {["Коллекция", "Файлы и обработка"].map((group) => (
                <optgroup label={group} key={group}>
                  {SETTINGS_TABS.filter((item) => item.group === group).map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                </optgroup>
              ))}
            </select>
          </div>
          <nav aria-label="Разделы настроек" className="settings-nav">
            {["Коллекция", "Файлы и обработка"].map((group) => (
              <div className="settings-nav-group" key={group}>
                <p className="settings-nav-label">{group}</p>
                {SETTINGS_TABS.filter((item) => item.group === group).map((item) => {
                  const Icon = TAB_ICONS[item.value];
                  const params = new URLSearchParams(searchParams.toString());
                  params.set("tab", item.value);
                  return (
                    <a key={item.value} href={`/settings?${params}`} className="settings-nav-link focus-ring"
                      aria-current={tab === item.value ? "page" : undefined}
                      onClick={(event) => {
                        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
                        event.preventDefault();
                        if (tab !== item.value) window.history.pushState(null, "", event.currentTarget.href);
                      }}>
                      <Icon size={17} aria-hidden />
                      <span>{item.label}</span>
                      {item.value === "raters" || item.value === "storages" ? (
                        <span className="settings-nav-count">{item.value === "raters" ? raters.length : storages.length}</span>
                      ) : null}
                    </a>
                  );
                })}
              </div>
            ))}
          </nav>
          <Link href="/dev" className="settings-tools-link focus-ring">
            <Wrench size={15} aria-hidden /> Перепрогон HDR10+ <ArrowUpRight size={13} aria-hidden />
          </Link>
        </aside>

        <div className="settings-content">
        <div hidden={tab !== "storages"}>
          <StoragesSection
            storages={storages}
            onStorageSaved={(saved) =>
              setStorages((current) =>
                current.map((storage) =>
                  storage.id === saved.id ? saved : storage,
                ),
              )
            }
          />
        </div>

        <div hidden={tab !== "raters"}>
          <RatersSection raters={raters} onRatersChange={setRaters} />
        </div>
        {tab === "posters" ? <PosterQualitySection /> : null}
        <fieldset disabled={pending} className="settings-fields" hidden={["raters", "storages", "posters"].includes(tab)}>
        {tab === "scanner" ? (
          <ScannerSection
            value={draft.scanRootDisplay ?? ""}
            onChange={(runtime, display) =>
              setDraft((current) => ({
                ...current,
                scanRoot: runtime || null,
                scanRootDisplay: display || null,
              }))
            }
          />
        ) : null}
        {tab === "catalog" ? (
          <CatalogSection
            pageSize={draft.catalogPageSize}
            defaultSort={draft.catalogDefaultSort}
            onPageSizeChange={(catalogPageSize) =>
              setDraft((current) => ({ ...current, catalogPageSize }))
            }
            onDefaultSortChange={(catalogDefaultSort) =>
              setDraft((current) => ({ ...current, catalogDefaultSort }))
            }
          />
        ) : null}
        {tab === "builds" ? (
          <BuildsSection
            transcodeConcurrency={draft.buildTranscodeConcurrency}
            defaultAc3Bitrate={draft.defaultAc3Bitrate}
            defaultEac3Bitrate={draft.defaultEac3Bitrate}
            onTranscodeConcurrencyChange={(buildTranscodeConcurrency) =>
              setDraft((current) => ({ ...current, buildTranscodeConcurrency }))
            }
            onDefaultAc3BitrateChange={(defaultAc3Bitrate) =>
              setDraft((current) => ({ ...current, defaultAc3Bitrate }))
            }
            onDefaultEac3BitrateChange={(defaultEac3Bitrate) =>
              setDraft((current) => ({ ...current, defaultEac3Bitrate }))
            }
          />
        ) : null}
        {tab === "export" ? (
          <ExportSection
            value={draft.exportTargetDirDisplay ?? ""}
            onChange={(runtime, display) =>
              setDraft((current) => ({
                ...current,
                exportTargetDir: runtime || null,
                exportTargetDirDisplay: display || null,
              }))
            }
          />
        ) : null}
        </fieldset>
        </div>
      </div>

      {isDirty || (tab !== "raters" && tab !== "storages" && tab !== "posters") ? (
        <FormActionBar isDirty={isDirty} saving={pending} error={error}>
          {isDirty && <Button type="button" variant="ghost" disabled={pending} onClick={() => { setDraft(settings); setError(null); }}>Отменить</Button>}
          <Button
            type="button"
            variant="primary"
            onClick={handleSaveSettings}
            disabled={!isDirty || pending}
          >
            Сохранить
          </Button>
        </FormActionBar>
      ) : null}

    </div>
  );
}
