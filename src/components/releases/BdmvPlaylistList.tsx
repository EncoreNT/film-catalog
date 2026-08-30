"use client";

import { formatBytes } from "@/lib/shared/format-bytes";
import { formatDuration } from "@/lib/shared/duration-format";
import { pluralRu } from "@/lib/shared/russian-plural";

export interface BdmvPlaylistRow {
  path: string;
  fileName: string;
  durationSeconds: number | null;
  estimatedBytes: number;
  clipCount: number;
  missingClips: string[];
  likelyMain: boolean;
}

export function BdmvPlaylistList({
  playlists,
  selectedPath,
  onSelect,
}: {
  playlists: BdmvPlaylistRow[];
  selectedPath: string | null;
  onSelect: (path: string) => void;
}) {
  const extras = playlists.filter((p) => (p.durationSeconds ?? 0) < 5 * 60);
  const mains = playlists.filter((p) => (p.durationSeconds ?? 0) >= 5 * 60);
  const ordered = [...mains, ...extras];

  return (
    <div role="radiogroup" aria-label="Плейлист" className="space-y-2">
      {ordered.map((playlist) => {
        const missing = playlist.missingClips.length > 0;
        const extra = (playlist.durationSeconds ?? 0) < 5 * 60;
        const size = formatBytes(playlist.estimatedBytes, { unit: "short" });
        return (
          <label
            key={playlist.path}
            className={`flex cursor-pointer items-start gap-3 rounded-[var(--radius)] border px-3 py-2.5 ${
              selectedPath === playlist.path
                ? "border-accent/50 bg-accent/10"
                : "border-border bg-bg-elevated/40"
            } ${missing ? "opacity-60" : ""}`}
          >
            <input
              type="radio"
              name="bdmv-playlist"
              className="mt-1 accent-[var(--accent)]"
              checked={selectedPath === playlist.path}
              disabled={missing}
              onChange={() => onSelect(playlist.path)}
            />
            <span className="min-w-0 flex-1">
              <span className="flex flex-wrap items-baseline gap-2">
                <span className="font-mono-tech text-sm text-text">
                  {playlist.fileName}
                </span>
                {playlist.likelyMain ? (
                  <span className="font-mono-tech text-[10px] uppercase tracking-[0.14em] text-accent">
                    основной фильм
                  </span>
                ) : null}
                {extra ? (
                  <span className="font-mono-tech text-[10px] uppercase tracking-[0.14em] text-faint">
                    доп. материалы
                  </span>
                ) : null}
              </span>
              <span className="mt-0.5 block text-xs text-muted">
                {formatDuration(playlist.durationSeconds) ?? "без длительности"}
                {size ? ` · ${size}` : ""}
                {` · ${playlist.clipCount} ${pluralRu(playlist.clipCount, "клип", "клипа", "клипов")}`}
              </span>
              {missing ? (
                <span className="mt-1 block text-xs text-danger" role="alert">
                  Нет клипов: {playlist.missingClips.join(", ")}
                </span>
              ) : null}
            </span>
          </label>
        );
      })}
    </div>
  );
}
