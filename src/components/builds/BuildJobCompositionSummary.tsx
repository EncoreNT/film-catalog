import { useMemo } from "react";
import { KindBadge } from "@/components/builds/BuildAtoms";
import {
  BUILD_TRACK_KIND_SECTION,
  buildSourceReleaseMap,
  buildTrackActionSummary,
  buildTrackDetailLine,
  buildTrackTitle,
  groupBuildTracksByKind,
  normalizeBuildTrackKind,
  resolveBuildSourceTrack,
} from "@/lib/builds/build-detail-display";
import type { SerializedBuild } from "@/lib/builds/build-serialize";

const ACTION_TONE_CLASS = {
  neutral: "border-border-strong bg-bg-deep/40 text-muted",
  accent: "border-accent/35 bg-accent/[0.08] text-accent-bright",
  neural: "border-neural/35 bg-neural/[0.08] text-neural-bright",
} as const;

function CompositionTrackRow({
  track,
  index,
  releases,
}: {
  track: SerializedBuild["tracks"][number];
  index: number;
  releases: ReturnType<typeof buildSourceReleaseMap>;
}) {
  const kind = normalizeBuildTrackKind(track.kind);
  const action = buildTrackActionSummary(track);
  const title = buildTrackTitle(track);
  const sourceTrack = resolveBuildSourceTrack(releases, track);
  const detailLine = buildTrackDetailLine(track, sourceTrack);

  return (
    <li className="flex items-start gap-2.5 rounded-[var(--radius-sm)] border border-border-strong bg-bg-surface px-3 py-2.5 sm:gap-3">
      <span className="font-mono-tech w-5 shrink-0 pt-1.5 text-[10px] tabular-nums text-faint">
        #{index + 1}
      </span>
      <KindBadge kind={kind} size="sm" />
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className="min-w-0 truncate text-sm font-medium leading-snug text-text" title={title}>
            {title}
          </p>
          <span
            className={`font-mono-tech shrink-0 rounded-full border px-2 py-0.5 text-[9px] uppercase tracking-[0.1em] sm:text-[10px] ${ACTION_TONE_CLASS[action.tone]}`}
          >
            {action.label}
          </span>
        </div>
        {detailLine ? (
          <p
            className="mt-0.5 truncate font-mono-tech text-[10px] tracking-[0.02em] text-muted sm:text-[11px]"
            title={detailLine}
          >
            {detailLine}
          </p>
        ) : null}
      </div>
    </li>
  );
}

export function BuildJobCompositionSummary({
  tracks,
  sources,
}: {
  tracks: SerializedBuild["tracks"];
  sources: SerializedBuild["sources"];
}) {
  const releases = useMemo(() => buildSourceReleaseMap(sources), [sources]);
  const groups = groupBuildTracksByKind(tracks);

  if (groups.length === 0) {
    return <p className="text-sm text-muted">Дорожки не заданы.</p>;
  }

  return (
    <div className="space-y-5">
      {groups.map(({ kind, items }) => {
        const section = BUILD_TRACK_KIND_SECTION[kind];
        return (
          <div key={kind}>
            <div className="mb-2 flex items-baseline justify-between gap-2">
              <p className="text-sm font-medium text-text">{section.title}</p>
              <span className="font-mono-tech text-[10px] uppercase tracking-[0.12em] text-faint">
                {items.length}{" "}
                {kind === "video"
                  ? items.length === 1
                    ? "поток"
                    : "потока"
                  : kind === "audio"
                    ? items.length === 1
                      ? "дорожка"
                      : items.length < 5
                        ? "дорожки"
                        : "дорожек"
                    : items.length === 1
                      ? "дорожка"
                      : items.length < 5
                        ? "дорожки"
                        : "дорожек"}
              </span>
            </div>
            <ul className="space-y-1.5">
              {items.map((track) => (
                <CompositionTrackRow
                  key={track.id}
                  track={track}
                  index={track.sortOrder}
                  releases={releases}
                />
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}
