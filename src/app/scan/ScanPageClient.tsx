"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/primitives/Button";
import { Field } from "@/components/primitives/Field";
import { StoragePicker } from "@/components/shared/StoragePicker";
import { useStoragePicker } from "@/hooks/useStoragePicker";
import { ScanStatsCards } from "@/components/scan/ScanStatsCards";
import { ScanSummaryPanel } from "@/components/scan/ScanSummaryPanel";
import { DraftQueueGrid } from "@/components/scan/DraftQueueGrid";
import {
  ScanProgressModal,
  type ScanProgress,
} from "@/components/scan/ScanProgressModal";
import { parseNdjsonStream } from "@/lib/api/ndjson-stream";
import type { ScanStreamEvent, ScanSummary } from "@/lib/media/scanner";
import type { MovieWithTracks } from "@/lib/movies/movie-query";

interface Stats {
  draft: number;
  catalog: number;
}

interface ScanPageClientProps {
  initialScanRoot: string;
  initialStats: Stats;
  initialDrafts: MovieWithTracks[];
}

export function ScanPageClient({
  initialScanRoot,
  initialStats,
  initialDrafts,
}: ScanPageClientProps) {
  const router = useRouter();
  const [scanRoot, setScanRoot] = useState(initialScanRoot);
  const {
    storageKind,
    setStorageKind,
    selectedStorageId,
    setSelectedStorageId,
    externalStorages,
    createExternalStorage,
    validateStorage,
    resolveExternalStorageId,
  } = useStoragePicker();
  const [scanning, setScanning] = useState(false);
  const [progress, setProgress] = useState<ScanProgress | null>(null);
  const [cancelled, setCancelled] = useState(false);
  const [summary, setSummary] = useState<ScanSummary | null>(null);
  const [stats, setStats] = useState<Stats>(initialStats);
  const [drafts, setDrafts] = useState<MovieWithTracks[]>(initialDrafts);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const refreshAfterScan = async () => {
    const [statsRes, draftsRes] = await Promise.all([
      fetch("/api/stats"),
      fetch("/api/movies?status=DRAFT&limit=24"),
    ]);
    const statsData = await statsRes.json();
    setStats({ draft: statsData.draft, catalog: statsData.catalog });
    const draftsData = await draftsRes.json();
    setDrafts(draftsData.movies ?? []);
    router.refresh();
  };

  const runScan = async () => {
    const storageError = validateStorage();
    if (storageError) {
      setError(storageError);
      return;
    }

    let externalStorageId: number | null = null;
    try {
      externalStorageId = await resolveExternalStorageId();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка хранилища");
      return;
    }

    setScanning(true);
    setCancelled(false);
    setError(null);
    setSummary(null);
    setProgress({ index: 0, total: 0, fileName: "" });

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scanRoot,
          externalStorageId,
        }),
        signal: controller.signal,
      });
      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "Сканирование не удалось");
      }

      const handleEvent = (event: ScanStreamEvent) => {
        switch (event.type) {
          case "start":
            setProgress({ index: 0, total: event.total, fileName: "" });
            break;
          case "file":
            setProgress({
              index: event.index,
              total: event.total,
              fileName: event.fileName,
            });
            break;
          case "summary":
            setSummary(event.summary);
            if (event.summary.cancelled) setCancelled(true);
            break;
          case "error":
            setError(event.message);
            break;
        }
      };

      await parseNdjsonStream<ScanStreamEvent>(res.body, handleEvent);

      await refreshAfterScan();
    } catch (err) {
      if (controller.signal.aborted) {
        setCancelled(true);
        await refreshAfterScan().catch(() => {});
      } else {
        setError(err instanceof Error ? err.message : "Ошибка");
      }
    } finally {
      setScanning(false);
      setProgress(null);
      abortRef.current = null;
    }
  };

  const cancelScan = () => {
    abortRef.current?.abort();
  };

  const approveDraft = async (id: number) => {
    await fetch(`/api/movies/${id}/approve`, { method: "POST" });
    setDrafts((prev) => prev.filter((movie) => movie.id !== id));
    setStats((prev) => ({
      catalog: prev.catalog + 1,
      draft: Math.max(0, prev.draft - 1),
    }));
    router.refresh();
  };

  const pct =
    progress && progress.total > 0
      ? Math.round((progress.index / progress.total) * 100)
      : 0;

  return (
    <div className="space-y-10">
      <div>
        <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
          Сканирование
        </h1>
        <p className="mt-2 text-sm text-muted">
          Укажите корневую папку с фильмами и запустите сканирование
        </p>
      </div>

      <ScanStatsCards catalog={stats.catalog} draft={stats.draft} />

      <div className="surface-card space-y-4 p-5">
        <Field
          label="Корневая папка"
          value={scanRoot}
          onChange={(e) => setScanRoot(e.target.value)}
          placeholder="/Users/you/Movies"
          hint="Абсолютный путь к папке с фильмами. Можно задать через SCAN_ROOT в .env. Путь сохраняется при сканировании."
        />
        <StoragePicker
          storageKind={storageKind}
          onStorageKindChange={setStorageKind}
          externalStorages={externalStorages}
          selectedStorageId={selectedStorageId}
          onSelectedStorageIdChange={setSelectedStorageId}
          onCreateExternalStorage={createExternalStorage}
        />
        <div className="flex flex-wrap gap-3">
          <Button
            variant="primary"
            loading={scanning}
            onClick={runScan}
            disabled={scanning}
          >
            Сканировать
          </Button>
        </div>
        {error ? (
          <p className="text-sm text-danger" role="alert">
            {error}
          </p>
        ) : null}
      </div>

      {summary ? (
        <ScanSummaryPanel summary={summary} cancelled={cancelled} />
      ) : null}

      <DraftQueueGrid drafts={drafts} onApprove={approveDraft} />

      {scanning || cancelled ? (
        <ScanProgressModal
          scanning={scanning}
          cancelled={cancelled}
          progress={progress}
          pct={pct}
          onCancel={cancelScan}
          onClose={() => setCancelled(false)}
        />
      ) : null}
    </div>
  );
}
