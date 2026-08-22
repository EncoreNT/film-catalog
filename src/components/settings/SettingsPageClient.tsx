"use client";

import Link from "next/link";
import { useMemo, useState, useTransition, type Dispatch, type SetStateAction } from "react";
import { PageHeader } from "@/components/primitives/PageHeader";
import { SegmentedControl } from "@/components/primitives/SegmentedControl";
import { FormActionBar } from "@/components/primitives/FormActionBar";
import { Button } from "@/components/primitives/Button";
import { RatersSection } from "@/components/settings/RatersSection";
import { ScannerSection } from "@/components/settings/ScannerSection";
import { CatalogSection } from "@/components/settings/CatalogSection";
import { BuildsSection } from "@/components/settings/BuildsSection";
import { ExportSection } from "@/components/settings/ExportSection";
import type { AppSettingsSnapshot } from "@/lib/db/settings";
import { apiFetch } from "@/lib/api/client";

type SettingsTab = "raters" | "scanner" | "catalog" | "builds" | "export";

export type RaterView = {
  id: number;
  name: string;
  sortOrder: number;
};

interface SettingsPageClientProps {
  initialRaters: RaterView[];
  initialSettings: AppSettingsSnapshot;
}

export function SettingsPageClient({
  initialRaters,
  initialSettings,
}: SettingsPageClientProps) {
  const [tab, setTab] = useState<SettingsTab>("raters");
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
        setError(err instanceof Error ? err.message : "Не удалось сохранить настройки");
      }
    });
  };

  return (
    <div className="pb-24">
      <PageHeader
        eyebrow="система"
        title="Настройки"
        subtitle="Оценщики, каталог, сборки и пути к данным."
      />

      <div className="mt-8 space-y-6">
        <SegmentedControl
          value={tab}
          onChange={setTab}
          ariaLabel="Разделы настроек"
          options={[
            { value: "raters", label: "Оценщики" },
            { value: "scanner", label: "Сканер" },
            { value: "catalog", label: "Каталог" },
            { value: "builds", label: "Сборка" },
            { value: "export", label: "Экспорт" },
          ]}
        />

        {tab === "raters" ? (
          <RatersSection raters={raters} onRatersChange={setRaters} />
        ) : null}
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

      {tab !== "raters" ? (
        <FormActionBar isDirty={isDirty} saving={pending} error={error}>
          <Button type="button" onClick={handleSaveSettings} disabled={!isDirty || pending}>
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
