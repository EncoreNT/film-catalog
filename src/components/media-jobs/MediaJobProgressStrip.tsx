"use client";

import { useRef, useState } from "react";
import { ArrowRight, ArrowRightLeft, HardDriveDownload } from "lucide-react";
import { Button } from "@/components/primitives/Button";
import { MediaJobProgressReadout } from "./MediaJobProgressReadout";
import { buildMediaJobStatusMeta, mediaJobSizeHint, mediaJobSpeedLabel, type MediaJobKind } from "@/lib/media-jobs/job-display";
import type { SerializedMediaJobBase } from "@/lib/media-jobs/serialize-base";
import "./media-job-progress-strip.css";

type ProgressJob = Pick<SerializedMediaJobBase,
  "id" | "status" | "phase" | "progressPercent" | "progressMessage" | "progressSpeed" |
  "sourceFileSize" | "targetPathDisplay" | "cancelRequested" | "startedAt" | "updatedAt"
>;

export interface MediaJobProgressStripProps {
  job: ProgressJob;
  loading: boolean;
  etaLabel: string | null;
  onOpen: () => void;
  onCancel: () => void | Promise<unknown>;
}

/** The movie's active operation, using the same progress/ETA rules as the queue. */
export function MediaJobProgressStrip({ job, kind, loading, etaLabel, onOpen, onCancel }: MediaJobProgressStripProps & { kind: MediaJobKind }) {
  const [error, setError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const cancelLock = useRef(false);
  const running = job.status === "RUNNING";
  const progress = job.progressPercent == null ? null : Math.min(100, Math.max(0, Math.round(job.progressPercent)));
  const speed = mediaJobSpeedLabel(job.progressSpeed);
  const size = mediaJobSizeHint(job.sourceFileSize);
  const title = kind === "move" ? "Перемещение релиза" : "Копирование для ТВ";
  const state = buildMediaJobStatusMeta(kind)[job.status].label;
  const Icon = kind === "move" ? ArrowRightLeft : HardDriveDownload;
  const busy = loading || cancelling;

  async function cancel() {
    if (cancelLock.current || busy || job.cancelRequested) return;
    cancelLock.current = true;
    setCancelling(true);
    setError(null);
    try {
      await onCancel();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось отменить операцию. Попробуйте ещё раз.");
    } finally {
      cancelLock.current = false;
      setCancelling(false);
    }
  }

  return (
    <section className="release-transfer" aria-label={title} aria-busy={busy}>
      <div className="release-transfer-content">
        <div className="release-transfer-heading">
          <Icon size={18} aria-hidden />
          <h3>{title}</h3>
          <span className="release-transfer-state" role="status">
            {job.cancelRequested ? "Останавливаем…" : !running ? state : null}
          </span>
        </div>
        <div className="release-transfer-destination">
          <span>Куда <ArrowRight size={12} aria-hidden /></span>
          <p title={job.targetPathDisplay}>{job.targetPathDisplay}</p>
        </div>

      </div>
      <div className="release-transfer-actions">
        <Button type="button" variant="ghost" onClick={onOpen}>Подробнее <ArrowRight size={14} aria-hidden /></Button>
        <Button type="button" variant="secondary" loading={busy} disabled={job.cancelRequested} onClick={() => void cancel()}>
          {job.cancelRequested ? "Отменяем…" : "Отменить"}
        </Button>
      </div>
      {error && <p className="release-transfer-error" role="alert">{error}</p>}
      <MediaJobProgressReadout percent={running ? progress : null} label={title}
        message={running ? job.progressMessage || "Подготовка файла…" : `В очереди${size ? ` · ${size}` : ""}`}
        speed={running ? speed : null} eta={running ? etaLabel : null} />
    </section>
  );
}
