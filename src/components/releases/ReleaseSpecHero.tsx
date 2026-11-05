import { AudioLines, Sun, Waves } from "lucide-react";
import type { ReleaseDetailView } from "@/lib/releases/release-detail-view";

const resolutionNames: Record<string, string> = {
  "4K": "Ultra HD", "1080p": "Full HD", "720p": "HD", "576p": "SD", "480p": "SD",
};

export function ReleaseSpecHero({ release }: { release: ReleaseDetailView }) {
  const { video, mainAudio: track, premiumHdr: hdr, premiumAtmos } = release;
  const [range, profile] = (video.dynamicRange ?? "Нет данных").split(" · ");
  const hdrNote = hdr?.sublabel === "Dynamic Metadata" ? "Динамические метаданные" : hdr?.sublabel;
  const spatialName = track?.is3D && track.formatLabel?.includes("Atmos") ? "Atmos"
    : track?.is3D && track.formatLabel?.includes("DTS:X") ? "DTS:X" : null;
  const otherAudio = premiumAtmos && (premiumAtmos.label !== track?.formatLabel || premiumAtmos.sublabel !== track?.channelLayout)
    ? [premiumAtmos.label, premiumAtmos.sublabel].join(" · ") : null;
  const specs = [
    {
      label: "Разрешение", tone: video.resolution === "4K" ? "gold" : "neutral", Icon: null,
      value: video.resolution, subtitle: resolutionNames[video.resolution],
      details: [[release.vPixels, video.codec].filter(Boolean).join(" · ")],
    },
    {
      label: "Динамический диапазон", tone: hdr?.isDolbyVision ? "violet" : hdr ? "gold" : "neutral", Icon: Sun,
      value: range, subtitle: null, details: [profile, hdrNote],
    },
    {
      label: spatialName ? "Объёмный звук" : "Основной звук", tone: track?.is3D ? "ruby" : "neutral",
      Icon: track?.is3D ? Waves : AudioLines,
      value: [spatialName ?? track?.formatLabel, track?.channelLayout].filter(Boolean).join("\u00a0") || "Нет данных",
      subtitle: null,
      details: [
        [spatialName && track?.formatLabel, track?.langLabel, track?.translation].filter(Boolean).join(" · "),
        otherAudio && `Также: ${otherAudio}`,
      ],
    },
  ];

  return (
    <div className="movie-quality" aria-label="Качество выбранного релиза">
      {specs.map(({ label, tone, Icon, value, subtitle, details }, index) => (
        <article key={label} className="movie-quality-card" data-tone={tone}>
          <div className="movie-plaque-core">
            <span className="movie-plaque-label">{label}</span>
            <div className="movie-plaque-reading">
              {Icon && <span className="movie-plaque-icon"><Icon size={18} strokeWidth={1.6} aria-hidden /></span>}
              <strong>{value}</strong>
            </div>
            {subtitle && <span className="movie-plaque-subtitle">{subtitle}</span>}
            <small>{details.filter(Boolean).map((line, i) => <span key={i}>{line}</span>)}</small>
            {index === 0 && video.resolution === "4K" && <span className="movie-plaque-flare" aria-hidden />}
          </div>
        </article>
      ))}
    </div>
  );
}
