"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/primitives/Button";
import { MachinedCard, CardSectionHeader } from "@/components/primitives/MachinedCard";
import { apiFetch } from "@/lib/api/client";
import type { SerializedBuild } from "@/lib/builds/build-serialize";
import { BuildWarningsPanel } from "@/components/builds/BuildWarningsPanel";

const TERMINAL = new Set(["SUCCEEDED", "FAILED", "CANCELLED"]);

export function BuildJobDetailClient({
  initialBuild,
}: {
  initialBuild: SerializedBuild;
}) {
  const [build, setBuild] = useState(initialBuild);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const next = await apiFetch<SerializedBuild>(
      `/api/builds/${build.id}`,
      undefined,
      "Не удалось загрузить сборку",
    );
    setBuild(next);
  }, [build.id]);

  useEffect(() => {
    if (TERMINAL.has(build.status)) return;
    const timer = setInterval(() => {
      void refresh().catch(() => undefined);
    }, 3000);
    return () => clearInterval(timer);
  }, [build.status, refresh]);

  const handleCancel = async () => {
    setLoading(true);
    setError(null);
    try {
      const next = await apiFetch<SerializedBuild>(
        `/api/builds/${build.id}/cancel`,
        { method: "POST" },
        "Не удалось отменить",
      );
      setBuild(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = async () => {
    setLoading(true);
    setError(null);
    try {
      const next = await apiFetch<SerializedBuild>(
        `/api/builds/${build.id}/retry`,
        { method: "POST" },
        "Не удалось повторить",
      );
      setBuild(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <MachinedCard variant="calm" bodyClassName="space-y-4">
        <CardSectionHeader
          label="сборка"
          title={`${build.movie.title} #${build.id}`}
        />
        <p className="text-sm text-muted">Статус: {build.status}</p>
        {build.phase ? (
          <p className="text-sm text-text">{build.phase}</p>
        ) : null}
        {build.progressMessage ? (
          <p className="text-sm text-muted">{build.progressMessage}</p>
        ) : null}
        {build.progressPercent != null ? (
          <div className="h-2 overflow-hidden rounded-full bg-bg-elevated">
            <div
              className="h-full bg-accent"
              style={{ width: `${Math.round(build.progressPercent)}%` }}
            />
          </div>
        ) : null}
        <p className="break-all text-sm text-faint">{build.outputPath}</p>
        {build.errorMessage ? (
          <p className="text-sm text-danger">{build.errorMessage}</p>
        ) : null}
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/movies/${build.movie.slug}`}
            className="focus-ring inline-flex min-h-10 items-center rounded-[var(--radius)] border border-border-strong px-4 text-sm text-text"
          >
            К фильму
          </Link>
          {build.outputReleaseId ? (
            <Link
              href={`/movies/${build.movie.slug}?release=${build.outputReleaseId}`}
              className="focus-ring inline-flex min-h-10 items-center rounded-[var(--radius)] border border-accent/40 px-4 text-sm text-accent"
            >
              Открыть релиз
            </Link>
          ) : null}
          {build.status === "QUEUED" || build.status === "RUNNING" ? (
            <Button
              type="button"
              variant="danger"
              loading={loading}
              onClick={() => void handleCancel()}
            >
              Отменить
            </Button>
          ) : null}
          {build.status === "FAILED" || build.status === "CANCELLED" ? (
            <Button
              type="button"
              variant="secondary"
              loading={loading}
              onClick={() => void handleRetry()}
            >
              Повторить
            </Button>
          ) : null}
        </div>
        {error ? <p className="text-sm text-danger">{error}</p> : null}
      </MachinedCard>

      {build.warnings.length > 0 ? (
        <BuildWarningsPanel
          validation={{
            ok: true,
            warnings: build.warnings as { code: string; message: string; severity: string }[],
          }}
          ackWarnings
          onAckChange={() => undefined}
        />
      ) : null}

      <MachinedCard variant="calm" bodyClassName="space-y-3">
        <CardSectionHeader label="дорожки" title="Состав сборки" />
        {build.tracks.map((track) => (
          <div
            key={track.id}
            className="rounded-[var(--radius-sm)] border border-border bg-bg-elevated/60 px-3 py-2 text-sm text-muted"
          >
            {track.kind} · stream {track.sourceStreamIndex}
            {track.audioMode ? ` · ${track.audioMode}` : ""}
            {track.transcodeCodec
              ? ` · ${track.transcodeCodec} ${track.transcodeBitrate}k`
              : ""}
            {track.offsetMs ? ` · offset ${track.offsetMs}ms` : ""}
          </div>
        ))}
      </MachinedCard>
    </div>
  );
}
