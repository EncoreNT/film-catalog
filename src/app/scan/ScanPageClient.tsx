"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { X } from "lucide-react";
import { Button } from "@/components/primitives/Button";
import { Field } from "@/components/primitives/Field";
import { StoragePicker } from "@/components/StoragePicker";
import { useStoragePicker } from "@/hooks/useStoragePicker";
import { MovieCard } from "@/components/MovieCard";
import type { ScanSummary } from "@/lib/scanner";
import type { MovieWithTracks } from "@/lib/movie-query";

interface Stats {
  draft: number;
  catalog: number;
}

interface ScanPageClientProps {
  initialScanRoot: string;
  initialStats: Stats;
  initialDrafts: MovieWithTracks[];
}

interface ScanProgress {
  index: number;
  total: number;
  fileName: string;
}

type ScanStreamEvent =
  | { type: "start"; total: number }
  | { type: "file"; index: number; total: number; fileName: string; filePath: string }
  | { type: "summary"; summary: ScanSummary }
  | { type: "error"; message: string };

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

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

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

      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let nl: number;
        while ((nl = buffer.indexOf("\n")) !== -1) {
          const line = buffer.slice(0, nl).trim();
          buffer = buffer.slice(nl + 1);
          if (!line) continue;
          try {
            handleEvent(JSON.parse(line) as ScanStreamEvent);
          } catch {
            // ignore malformed line
          }
        }
      }
      buffer += decoder.decode();
      const tail = buffer.trim();
      if (tail) {
        try {
          handleEvent(JSON.parse(tail) as ScanStreamEvent);
        } catch {
          // ignore
        }
      }

      await refreshAfterScan();
    } catch (err) {
      if (controller.signal.aborted) {
        setCancelled(true);
        // Partial work may have happened — refresh to reflect it.
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

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="surface-card p-5">
          <p className="font-mono-tech text-muted">в каталоге</p>
          <p className="font-display mt-1 text-3xl font-bold text-accent">
            {stats.catalog}
          </p>
        </div>
        <div className="surface-card p-5">
          <p className="font-mono-tech text-muted">черновики</p>
          <p className="font-display mt-1 text-3xl font-bold">{stats.draft}</p>
        </div>
      </div>

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
        <div className="surface-card p-5">
          <h2 className="font-display mb-4 text-xl font-semibold">Сводка</h2>
          {cancelled ? (
            <p className="font-mono-tech mb-3 text-sm text-accent">
              сканирование отменено — показаны частичные результаты
            </p>
          ) : null}
          <dl className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <dt className="text-muted">Найдено файлов</dt>
              <dd className="font-mono-tech text-lg">{summary.found}</dd>
            </div>
            <div>
              <dt className="text-muted">Новых черновиков</dt>
              <dd className="font-mono-tech text-lg text-accent">
                {summary.newDrafts}
              </dd>
            </div>
            <div>
              <dt className="text-muted">Обновлено</dt>
              <dd className="font-mono-tech text-lg">{summary.updated}</dd>
            </div>
            <div>
              <dt className="text-muted">Перемещено</dt>
              <dd className="font-mono-tech text-lg">{summary.moved}</dd>
            </div>
            <div>
              <dt className="text-muted">Пропущено</dt>
              <dd className="font-mono-tech text-lg">{summary.skipped}</dd>
            </div>
          </dl>
          {summary.errors.length > 0 ? (
            <div className="mt-4">
              <p className="font-mono-tech text-danger">ошибки</p>
              <ul className="mt-2 space-y-1 text-xs text-muted">
                {summary.errors.map((entry) => (
                  <li key={entry}>{entry}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}

      <section>
        <div className="mb-6 flex items-center justify-between gap-4">
          <h2 className="font-display text-2xl font-semibold">
            Очередь черновиков
          </h2>
          <Link
            href="/?status=DRAFT"
            className="focus-ring text-sm text-accent hover:underline"
          >
            Все черновики →
          </Link>
        </div>
        {drafts.length === 0 ? (
          <div className="surface-card px-6 py-12 text-center text-sm text-muted">
            Нет черновиков. Запустите сканирование.
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {drafts.map((movie, index) => (
              <div key={movie.id} className="space-y-2">
                <MovieCard movie={movie} index={index} />
                <Button
                  variant="primary"
                  className="w-full"
                  onClick={() => approveDraft(movie.id)}
                >
                  В каталог
                </Button>
              </div>
            ))}
          </div>
        )}
      </section>

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

interface ScanProgressModalProps {
  scanning: boolean;
  cancelled: boolean;
  progress: ScanProgress | null;
  pct: number;
  onCancel: () => void;
  onClose: () => void;
}

function ScanProgressModal({
  scanning,
  cancelled,
  progress,
  pct,
  onCancel,
  onClose,
}: ScanProgressModalProps) {
  const total = progress?.total ?? 0;
  const index = progress?.index ?? 0;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-bg-deep/70 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Сканирование"
    >
      <div className="surface-card w-full max-w-md space-y-5 p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-display text-xl font-semibold">
              {cancelled ? "Сканирование отменено" : "Сканирование…"}
            </h2>
            <p className="font-mono-tech mt-1 text-xs text-muted">
              {total > 0
                ? `файл ${index} из ${total}`
                : "подсчёт файлов…"}
            </p>
          </div>
          {cancelled ? (
            <button
              type="button"
              onClick={onClose}
              aria-label="Закрыть"
              className="focus-ring rounded-md p-1.5 text-muted transition-colors hover:text-text"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          ) : null}
        </div>

        <div className="space-y-2">
          <div className="h-2 w-full overflow-hidden rounded-full bg-bg-elevated">
            <div
              className="h-full rounded-full bg-accent transition-[width] duration-200 ease-out"
              style={{ width: `${cancelled ? 100 : pct}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-xs text-muted">
            <span className="font-mono-tech">{pct}%</span>
            <span className="font-mono-tech">
              {cancelled ? "остановлено" : "в процессе"}
            </span>
          </div>
        </div>

        {progress?.fileName ? (
          <p
            className="truncate rounded-md border border-border bg-bg-surface px-3 py-2 font-mono text-xs text-muted"
            title={progress.fileName}
          >
            {progress.fileName}
          </p>
        ) : null}

        <div className="flex justify-end gap-3">
          {cancelled ? (
            <Button variant="secondary" onClick={onClose}>
              Закрыть
            </Button>
          ) : (
            <Button variant="danger" onClick={onCancel} disabled={!scanning}>
              Отмена
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
