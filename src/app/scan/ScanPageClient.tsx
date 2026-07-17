"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { BackLink } from "@/components/primitives/BackLink";
import { ScanToolbar } from "@/components/scan/ScanToolbar";
import { ScanSummaryPanel } from "@/components/scan/ScanSummaryPanel";
import { DraftQueueGrid } from "@/components/scan/DraftQueueGrid";
import {
  ScanProgressModal,
  type ScanProgress,
} from "@/components/scan/ScanProgressModal";
import { useStoragePicker } from "@/hooks/useStoragePicker";
import { parseNdjsonStream } from "@/lib/api/ndjson-stream";
import { approveMovie, parseApiError } from "@/lib/api/client";
import type { ScanStreamEvent, ScanSummary } from "@/lib/media/scanner";
import type { MovieWithTracks } from "@/lib/movies/movie-query";
import { commitFilePathInput } from "@/lib/shared/display-path";

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

  const persistScanRoot = async (path: string) => {
    const trimmed = path.trim();
    if (!trimmed) return;

    try {
      const res = await fetch("/api/scan", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scanRoot: trimmed }),
      });
      if (!res.ok) {
        throw new Error(await parseApiError(res, "Не удалось сохранить папку"));
      }
      const data = (await res.json()) as { scanRootDisplay?: string | null };
      if (data.scanRootDisplay) {
        setScanRoot(data.scanRootDisplay);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось сохранить папку");
    }
  };

  const handleScanRootBlur = () => {
    const trimmed = scanRoot.trim();
    if (!trimmed) return;
    const { display } = commitFilePathInput(trimmed);
    setScanRoot(display);
    void persistScanRoot(display);
  };

  const refreshAfterScan = async () => {
    const [statsRes, draftsRes] = await Promise.all([
      fetch("/api/stats"),
      fetch("/api/movies?status=DRAFT&limit=24"),
    ]);
    const statsData = await statsRes.json();
    setStats({ draft: statsData.draft, catalog: statsData.catalog });
    const draftsData = await draftsRes.json();
    setDrafts(draftsData.items ?? []);
    router.refresh();
  };

  const runScan = async () => {
    const trimmedRoot = scanRoot.trim();
    if (!trimmedRoot) {
      setError("Укажите корневую папку с видеофайлами");
      return;
    }

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
          scanRoot: trimmedRoot,
          externalStorageId,
        }),
        signal: controller.signal,
      });
      if (!res.ok || !res.body) {
        throw new Error(await parseApiError(res, "Сканирование не удалось"));
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
    try {
      await approveMovie(id);
      setDrafts((prev) => prev.filter((movie) => movie.id !== id));
      setStats((prev) => ({
        catalog: prev.catalog + 1,
        draft: Math.max(0, prev.draft - 1),
      }));
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось опубликовать фильм");
    }
  };

  const pct =
    progress && progress.total > 0
      ? Math.round((progress.index / progress.total) * 100)
      : 0;

  const subtitle =
    stats.draft > 0
      ? `${stats.draft} ждут проверки, ${stats.catalog} уже в каталоге`
      : `${stats.catalog} в каталоге`;

  return (
    <div className="space-y-6">
      <BackLink href="/">Назад к каталогу</BackLink>

      <header className="min-w-0">
        <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
          Сканирование
        </h1>
        <p className="mt-1 font-mono-tech text-sm text-muted">{subtitle}</p>
      </header>

      <ScanToolbar
        scanRoot={scanRoot}
        onScanRootChange={setScanRoot}
        onScanRootBlur={handleScanRootBlur}
        scanning={scanning}
        error={error}
        storageKind={storageKind}
        onStorageKindChange={setStorageKind}
        externalStorages={externalStorages}
        selectedStorageId={selectedStorageId}
        onSelectedStorageIdChange={setSelectedStorageId}
        onCreateExternalStorage={createExternalStorage}
        onScan={runScan}
      />

      {summary ? (
        <ScanSummaryPanel summary={summary} cancelled={cancelled} />
      ) : null}

      <DraftQueueGrid
        drafts={drafts}
        draftTotal={stats.draft}
        onApprove={approveDraft}
      />

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
