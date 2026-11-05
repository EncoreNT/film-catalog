import { useState } from "react";
import { SlidersHorizontal } from "lucide-react";
import { Modal } from "@/components/primitives/Modal";
import type { ReleaseDetailView } from "@/lib/releases/release-detail-view";

type ComparisonRow = [string, (release: ReleaseDetailView) => string | null];
const rows: ComparisonRow[] = [
  ["Версия", r => r.versionLabel],
  ["Динамический диапазон", r => [r.video.dynamicRange, r.premiumHdr?.sublabel].filter(Boolean).join(" · ")],
  ["Видео", r => [r.video.codec, r.vPixels, r.video.fps && `${r.video.fps} fps`].filter(Boolean).join(" · ")],
  ["Битрейт видео", r => [r.video.vBitrateValue, r.video.vBitrateUnit].filter(Boolean).join(" ")],
  ["Основной звук", r => [r.mainAudio?.formatLabel, r.mainAudio?.channelLayout].filter(Boolean).join(" · ")],
  ["Дорожки", r => `${r.audioTracks.length} аудио / ${r.subtitleTracks.length} субт.`],
  ["Хранилище", r => r.storageLabel],
];

export function ReleaseComparison({ releases, activeId, onSelect }: {
  releases: ReleaseDetailView[];
  activeId: number;
  onSelect: (id: number) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className="movie-compare-trigger focus-ring" aria-label="Сравнить релизы" title="Сравнить релизы" aria-haspopup="dialog" onClick={() => setOpen(true)}>
        <SlidersHorizontal size={15} aria-hidden /><span className="movie-tool-label">Сравнить релизы</span>
      </button>
      <Modal title="Сравнение релизов" size="wide" open={open} onClose={() => setOpen(false)}>
        <div className="overflow-x-auto">
          <table className="movie-compare-table">
            <caption className="sr-only">Характеристики релизов. Выберите файл в заголовке столбца.</caption>
            <thead><tr><th scope="col">Параметр</th>
              {releases.map(r => (
                <th key={r.id} scope="col" data-selected={r.id === activeId}>
                  <button type="button" className="focus-ring" aria-pressed={r.id === activeId}
                    onClick={() => { onSelect(r.id); setOpen(false); }}>
                    <small>{r.label}</small>
                    <b>{r.fileSizeLabel ?? `Релиз #${r.id}`}</b>
                    <span>{r.id === activeId ? "Выбран" : "Выбрать"}</span>
                  </button>
                </th>
              ))}
            </tr></thead>
            <tbody>{rows.map(([label, read]) => (
              <tr key={label}><th scope="row">{label}</th>
                {releases.map(r => <td key={r.id} data-selected={r.id === activeId}>{read(r) || "Нет данных"}</td>)}
              </tr>
            ))}</tbody>
          </table>
        </div>
      </Modal>
    </>
  );
}
