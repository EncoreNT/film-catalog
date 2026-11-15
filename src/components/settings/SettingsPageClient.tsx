"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { PageHeader } from "@/components/primitives/PageHeader";
import { SegmentedControl } from "@/components/primitives/SegmentedControl";
import { FormActionBar } from "@/components/primitives/FormActionBar";
import { Button } from "@/components/primitives/Button";
import { RatersSection } from "@/components/settings/RatersSection";
import { ScannerSection } from "@/components/settings/ScannerSection";
import { CatalogSection } from "@/components/settings/CatalogSection";
import { BuildsSection } from "@/components/settings/BuildsSection";
import { ExportSection } from "@/components/settings/ExportSection";
import { StoragesSection } from "@/components/settings/StoragesSection";
import { PosterQualitySection } from "./PosterQualitySection";
import { SETTINGS_TABS, type SettingsTab } from "./settings-tabs";
import type { StorageOption } from "@/lib/shared/storage-types";
import type { AppSettingsSnapshot } from "@/lib/db/settings";
import { apiFetch } from "@/lib/api/client";

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
  const [tab, setTab] = useState<SettingsTab>(initialTab);
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
    <div className="pb-24">
      <PageHeader
        eyebrow="система"
        title="Настройки"
        subtitle="Оценщики, постеры, внешние диски, каталог, сборки и пути к данным."
      />

      <div className="mt-8 space-y-6">
        <div className="[&>.segmented-control]:flex-wrap [&_.segmented-control>button]:basis-24">
          <SegmentedControl
            value={tab}
            onChange={(value) => {
              setTab(value);
              const url = new URL(window.location.href);
              url.searchParams.set("tab", value);
              window.history.replaceState(null, "", url);
            }}
            ariaLabel="Разделы настроек"
            options={[...SETTINGS_TABS]}
          />
        </div>

        {tab === "storages" ? (
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
        ) : null}

        {tab === "raters" ? (
          <RatersSection raters={raters} onRatersChange={setRaters} />
        ) : null}
        {tab === "posters" ? <PosterQualitySection /> : null}
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
      </div>

      {tab !== "raters" && tab !== "storages" && tab !== "posters" ? (
        <FormActionBar isDirty={isDirty} saving={pending} error={error}>
          <Button
            type="button"
            onClick={handleSaveSettings}
            disabled={!isDirty || pending}
          >
            Сохранить
          </Button>
        </FormActionBar>
      ) : null}

      <p className="mt-10 text-xs text-faint">
        <Link href="/dev" className="hover:text-muted">
          Перепрогон HDR10+
        </Link>
      </p>
    </div>
  );
}
