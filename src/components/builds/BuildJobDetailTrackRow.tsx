import { KindBadge, SpecChip } from "@/components/builds/BuildAtoms";
import { kindMeta } from "@/lib/builds/build-display";
import {
  buildTrackDetailTags,
  buildTrackTitle,
  normalizeBuildTrackKind,
} from "@/lib/builds/build-detail-display";
import { buildOutputBasename } from "@/lib/builds/build-queue-display";
import type { SerializedBuild } from "@/lib/builds/build-serialize";

export function BuildJobDetailTrackRow({
  track,
  index,
}: {
  track: SerializedBuild["tracks"][number];
  index: number;
}) {
  const kind = normalizeBuildTrackKind(track.kind);
  const meta = kindMeta(kind);
  const tags = buildTrackDetailTags(track);
  const basename = buildOutputBasename(track.sourceFilePath);

  return (
    <div className="rounded-[var(--radius-sm)] border border-border/80 bg-bg-deep/35 px-3 py-3 sm:px-4">
      <div className="flex gap-3">
        <KindBadge kind={kind} size="sm" />
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0 space-y-0.5">
              <p className="font-mono-tech text-[10px] uppercase tracking-[0.14em] text-faint">
                #{index + 1} · {meta.label}
              </p>
              <p className="text-sm font-medium text-text">{buildTrackTitle(track)}</p>
            </div>
          </div>

          <p className="truncate font-mono-tech text-[11px] text-faint" title={track.sourceFilePath}>
            {basename}
          </p>

          {tags.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {tags.map((tag) => (
                <SpecChip key={`${track.id}-${tag.label}`} tag={tag} />
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
