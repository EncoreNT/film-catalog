import {
  AudioLines,
  Disc3,
  HardDrive,
  Layers,
  MonitorPlay,
  Plug,
  Sun,
  Waves,
} from "lucide-react";
import type { ReleaseDetailView } from "@/lib/releases/release-detail-view";
import { SpecTag } from "@/components/shared/SpecTag";

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
      return <Layers className="h-3.5 w-3.5" />;
    default:
      return null;
  }
}

export function SpecRibbon({ release }: { release: ReleaseDetailView }) {
  const hasResolution =
    release.video.resolution && release.video.resolution !== "—";

  return (
    <div className="flex flex-wrap items-center gap-2.5 border-b border-accent/15 pb-5">
      {hasResolution ? (
        <span
          className={`inline-flex items-baseline gap-1.5 rounded-md border px-2.5 py-1 ${
            release.premium4K
              ? "border-accent/45 bg-accent/10 shadow-[0_0_14px_var(--accent-glow)]"
              : "border-border-strong bg-bg-elevated"
          }`}
        >
          <span
            className={`font-display text-base font-semibold leading-none ${
              release.premium4K ? "text-accent-bright" : "text-text"
            }`}
          >
            {release.video.resolution}
          </span>
          {release.vPixels ? (
            <span className="font-mono text-[0.65rem] tabular-nums text-muted">
              {release.vPixels}
            </span>
          ) : null}
        </span>
      ) : null}

      {release.premiumHdr ? (
        <SpecTag
          kind="hdr"
          icon={<Sun className="h-3.5 w-3.5" />}
          note={release.premiumHdr.isDolbyVision ? "Dolby Vision" : undefined}
        >
          {release.premiumHdr.label}
        </SpecTag>
      ) : null}

      {release.premiumAtmos ? (
        <SpecTag
          kind="audio-3d"
          icon={<Waves className="h-3.5 w-3.5" />}
          note="RU · главная дорожка"
        >
          {release.premiumAtmos.label}
        </SpecTag>
      ) : null}
    </div>
  );
}
