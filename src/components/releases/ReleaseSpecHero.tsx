import { AudioLines, Monitor, Sun } from "lucide-react";
import type { ReleaseDetailView } from "@/lib/releases/release-detail-view";

const resolutionNames: Record<string, string> = {
  "4K": "Ultra HD", "1080p": "Full HD", "720p": "HD", "576p": "SD", "480p": "SD",
};

export function ReleaseSpecHero({ release }: { release: ReleaseDetailView }) {
  const track = release.mainAudio;
  const hdr = release.premiumHdr;
  const [range, profile] = (release.video.dynamicRange ?? "Нет данных").split(" · ");
  const hdrNote = hdr?.sublabel === "Dynamic Metadata" ? "Динамические метаданные" : hdr?.sublabel;
  const mainAudio = [track?.formatLabel, track?.channelLayout].filter(Boolean).join(" ");
  const videoRate = [
    release.video.vBitrateValue && `${release.video.vBitrateValue} ${release.video.vBitrateUnit}`,
    release.video.fps && `${release.video.fps} fps`,
  ].filter(Boolean).join(" · ");
  const specs = [
    {
      label: "Изображение", Icon: Monitor, value: release.video.resolution,
      note: [resolutionNames[release.video.resolution], release.video.codec, release.vPixels],
      effect: release.video.resolution === "4K" ? "holo-gold" : "",
    },
    {
      label: "Динамический диапазон", Icon: Sun, value: range, note: [profile, hdrNote],
      effect: hdr ? (hdr.isDolbyVision ? "holo-foil" : "holo-gold") : "",
    },
    {
      label: "Основной звук", Icon: AudioLines, value: mainAudio || "Нет данных",
      note: [track?.langLabel, track?.translation, release.premiumAtmos?.label, release.premiumAtmos?.sublabel],
      effect: release.premiumAtmos ? "holo-ruby" : "",
    },
  ];
  return (
    <div className="movie-quality" aria-label="Качество выбранного релиза">
      {specs.map(({ label, Icon, value, note, effect }, index) => (
        <article className={`movie-quality-card group/laser spec-plaque-in spec-plaque-in--${index + 1}`} key={label}>
          <span aria-hidden className="sheen-layer" />
          {index === 0 && release.video.resolution === "4K" && (
            <span aria-hidden className="lens-flare left-[4%] top-[34%] w-[50%] opacity-40" />
          )}
          {effect && <span aria-hidden className={`movie-card-foil ${effect}`} />}
          <Icon className="movie-quality-engraving" strokeWidth={0.7} aria-hidden />
          <div className="movie-plaque-label">{label}</div>
          <strong>{value}</strong>
          <small>
            {note.filter(Boolean).join(" · ")}
            {index === 0 && videoRate && <span className="block">{videoRate}</span>}
          </small>
        </article>
      ))}
    </div>
  );
}
