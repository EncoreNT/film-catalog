import Link from "next/link";
import { ArrowUpRight, Star } from "lucide-react";
import type { ReleaseWithTracks } from "@/lib/movies/movie-query";
import { releaseTabLabel } from "@/lib/media/spec-tags";
import { is4K, isAnyHDR, premiumAudio } from "@/lib/media/spec-tags";

interface MovieReleasesTooltipProps {
  releases: ReleaseWithTracks[];
  movieSlug: string;
  /** id of the primary (best) release — marked in the list. */
  primaryReleaseId: number | null;
}

function releaseSpecHints(release: ReleaseWithTracks): string[] {
  const hints: string[] = [];
  if (is4K(release)) hints.push("4K");
  if (isAnyHDR(release)) hints.push("HDR");
  if (premiumAudio(release)) hints.push("Atmos");
  return hints;
}

export function MovieReleasesTooltip({
  releases,
  movieSlug,
  primaryReleaseId,
}: MovieReleasesTooltipProps) {
  return (
    <div className="w-[min(18rem,calc(100vw-2rem))] p-2">
      <p className="font-mono-tech px-2 pb-1.5 pt-1 text-[0.6rem] uppercase tracking-wider text-faint">
        релизы фильма · {releases.length}
      </p>
      <ul className="space-y-0.5">
        {releases.map((release) => {
          const isPrimary = release.id === primaryReleaseId;
          const hints = releaseSpecHints(release);
          return (
            <li key={release.id}>
              <Link
                href={`/movies/${movieSlug}?release=${release.id}`}
                className="focus-ring group flex items-center justify-between gap-2.5 rounded-[var(--radius-sm)] px-2 py-1.5 transition-colors hover:bg-bg-surface"
              >
                <span className="flex min-w-0 items-center gap-2">
                  {isPrimary ? (
                    <Star
                      className="h-3.5 w-3.5 shrink-0 fill-accent text-accent"
                      aria-hidden
                    />
                  ) : (
                    <span
                      className="h-1.5 w-1.5 shrink-0 rounded-full bg-border-strong"
                      aria-hidden
                    />
                  )}
                  <span className="min-w-0">
                    <span className="block truncate text-sm text-text group-hover:text-accent">
                      {releaseTabLabel(release)}
                    </span>
                    {hints.length > 0 ? (
                      <span className="font-mono-tech mt-0.5 flex gap-1.5 text-[0.6rem] text-faint">
                        {hints.map((h) => (
                          <span key={h}>{h}</span>
                        ))}
                        {isPrimary ? (
                          <span className="text-accent/70">основной</span>
                        ) : null}
                      </span>
                    ) : isPrimary ? (
                      <span className="font-mono-tech mt-0.5 block text-[0.6rem] text-accent/70">
                        основной
                      </span>
                    ) : null}
                  </span>
                </span>
                <ArrowUpRight
                  className="h-3.5 w-3.5 shrink-0 text-faint transition-colors group-hover:text-accent"
                  aria-hidden
                />
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
