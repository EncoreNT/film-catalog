"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/primitives/Button";
import { Field } from "@/components/primitives/Field";
import { MovieCard } from "@/components/MovieCard";
import type { MovieWithTracks } from "@/lib/movie-query";

interface ScanSummary {
  found: number;
  newDrafts: number;
  updated: number;
  moved: number;
  skipped: number;
  errors: string[];
}

interface Stats {
  draft: number;
  catalog: number;
}

export default function ScanPage() {
  const router = useRouter();
  const [scanRoot, setScanRoot] = useState("");
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<ScanSummary | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [drafts, setDrafts] = useState<MovieWithTracks[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/scan")
      .then((r) => r.json())
      .then((d) => setScanRoot(d.scanRoot ?? ""));
    fetch("/api/stats")
      .then((r) => r.json())
      .then((d) => setStats({ draft: d.draft, catalog: d.catalog }));
    fetch("/api/movies?status=DRAFT&limit=24")
      .then((r) => r.json())
      .then((d) => setDrafts(d.movies ?? []));
  }, []);

  const saveRoot = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/scan", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scanRoot }),
      });
      if (!res.ok) throw new Error("Не удалось сохранить путь");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setLoading(false);
    }
  };

  const runScan = async () => {
    setLoading(true);
    setError(null);
    setSummary(null);
    try {
      const res = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scanRoot }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Сканирование не удалось");
      setSummary(data.summary);
      const statsRes = await fetch("/api/stats");
      setStats(await statsRes.json());
      const draftsRes = await fetch("/api/movies?status=DRAFT&limit=24");
      const draftsData = await draftsRes.json();
      setDrafts(draftsData.movies ?? []);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setLoading(false);
    }
  };

  const approveDraft = async (id: number) => {
    await fetch(`/api/movies/${id}/approve`, { method: "POST" });
    setDrafts((prev) => prev.filter((m) => m.id !== id));
    router.refresh();
  };

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

      {stats ? (
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
      ) : null}

      <div className="surface-card space-y-4 p-5">
        <Field
          label="Корневая папка"
          value={scanRoot}
          onChange={(e) => setScanRoot(e.target.value)}
          placeholder="/Users/you/Movies"
          hint="Абсолютный путь к папке с фильмами. Можно задать через SCAN_ROOT в .env."
        />
        <div className="flex flex-wrap gap-3">
          <Button variant="secondary" loading={loading} onClick={saveRoot}>
            Сохранить путь
          </Button>
          <Button variant="primary" loading={loading} onClick={runScan}>
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
                {summary.errors.map((e) => (
                  <li key={e}>{e}</li>
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
    </div>
  );
}
