import { Clock3 } from "lucide-react";
import "./media-job-progress-strip.css";

/** The same progress grouping in the release strip and its details dialog. */
export function MediaJobProgressReadout({ percent, message, speed, eta, label, expanded = false }: {
  percent: number | null;
  message: string;
  speed?: string | null;
  eta?: string | null;
  label: string;
  expanded?: boolean;
}) {
  const progress = percent == null ? null : Math.min(100, Math.max(0, Math.round(percent)));
  return (
    <div className="transfer-readout" data-expanded={expanded}>
      <div className="release-transfer-metrics">
        {progress != null && <strong className="release-transfer-percent">{progress}<small>%</small></strong>}
        <span>{message}</span>
        {speed && <span className="release-transfer-speed">{speed}</span>}
        {eta && <span className="release-transfer-eta"><Clock3 size={14} aria-hidden />{eta}</span>}
      </div>
      <div className="release-transfer-progress" role="progressbar" aria-label={label}
        aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress ?? undefined}
        aria-valuetext={progress == null ? message : `${progress}%${eta ? `, ${eta}` : ""}`}>
        {progress != null && <span style={{ transform: `scaleX(${progress / 100})` }} />}
      </div>
    </div>
  );
}
