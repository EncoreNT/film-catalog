import { ReleasePathBlock } from "@/components/releases/ReleasePathBlock";
import { MediaJobProgressReadout } from "@/components/media-jobs/MediaJobProgressReadout";

export function ReleaseJobDialogProgress({ activeDescription, targetDisplay, sizeHint, queued,
  progressPercent, progressMessage, speed, etaLabel, defaultProgressMessage = "Копирование…",
}: {
  activeDescription: string;
  targetDisplay?: string | null;
  sizeHint?: string | null;
  queued?: boolean;
  progressPercent?: number | null;
  progressMessage?: string | null;
  speed?: string | null;
  etaLabel?: string | null;
  defaultProgressMessage?: string;
}) {
  return (
    <div className="transfer-dialog-progress">
      <MediaJobProgressReadout expanded percent={queued ? null : progressPercent ?? null}
        label="Прогресс операции" message={queued ? "Ожидает запуска" : progressMessage || defaultProgressMessage}
        speed={queued ? null : speed} eta={queued ? null : etaLabel} />
      {targetDisplay && <ReleasePathBlock label="Папка и файл назначения" meta={sizeHint}>{targetDisplay}</ReleasePathBlock>}
      <p className="transfer-dialog-description">{activeDescription}</p>
    </div>
  );
}
