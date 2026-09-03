import {
  AudioLines,
  Clapperboard,
  Disc3,
  HardDrive,
  MonitorPlay,
  Plug,
  Sun,
  Waves,
} from "lucide-react";
import type { ReleaseDetailView } from "@/lib/releases/release-detail-view";

export function ReleaseTabStorageIcon({
  external,
  label,
}: {
  external: boolean;
  label: string | null;
}) {
  const Icon = external ? Plug : HardDrive;
  const title = external
    ? label
      ? `Внешний диск · ${label}`
      : "Внешний диск"
    : "Локальный диск";

  return (
    <span title={title} className="inline-flex shrink-0">
      <Icon className="h-3 w-3" aria-hidden />
    </span>
  );
}

/** Same weight as the storage glyph: another take, not the theatrical cut. */
export function ReleaseCutMark({ label }: { label: string }) {
  return (
    <span title={label} aria-label={label} className="inline-flex shrink-0">
      <Clapperboard className="h-3 w-3" aria-hidden />
    </span>
  );
}

export function tagIcon(kind: ReleaseDetailView["tags"][number]["kind"]) {
  switch (kind) {
    case "resolution":
      return <MonitorPlay className="h-3.5 w-3.5" />;
    case "hdr":
      return <Sun className="h-3.5 w-3.5" />;
    case "audio-3d":
      return <Waves className="h-3.5 w-3.5" />;
    case "audio":
      return <AudioLines className="h-3.5 w-3.5" />;
    case "channel":
      return <AudioLines className="h-3.5 w-3.5" />;
    case "release":
      return <Disc3 className="h-3.5 w-3.5" />;
    case "version":
      return <Clapperboard className="h-3.5 w-3.5" />;
    default:
      return null;
  }
}
