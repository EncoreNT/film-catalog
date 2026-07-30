import Link from "next/link";
import { ArrowUpRight, GitFork, Library } from "lucide-react";
import {
  RemakeRoleBadge,
  REMAKE_ROLE_PANEL_TONE,
} from "@/components/remakes/RemakeRoleBadge";
import type { MovieRemakeMembership } from "@/lib/remakes/remake-membership";

interface MovieRemakesProps {
  memberships: MovieRemakeMembership[];
  /** Franchises the current movie belongs to — used to detect affinity. */
  currentMovieFranchises?: { id: number; name: string; slug: string }[];
}

interface CoFranchise {
  id: number;
  name: string;
  slug: string;
}

type CoMember = MovieRemakeMembership["coMembers"][number];

interface FranchiseGroup {
  franchise: CoFranchise;
  members: CoMember[];
}

/** Sort co-members by release year ascending (nulls last). */
function sortByYearAsc<T extends { movieYear: number | null }>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    if (a.movieYear === null) return 1;
    if (b.movieYear === null) return -1;
    return a.movieYear - b.movieYear;
  });
}

/**
 * Franchises that appear on ≥2 movies within the remake group
 * (current movie + co-members). These define the "affinity" we
 * visualise by grouping co-members under a franchise header.
 */
function computeSharedFranchiseIds(
  currentMovieFranchises: CoFranchise[] | undefined,
  coMembers: CoMember[],
): Set<number> {
  const counts = new Map<number, number>();
  for (const f of currentMovieFranchises ?? []) {
    counts.set(f.id, (counts.get(f.id) ?? 0) + 1);
  }
  for (const co of coMembers) {
    for (const f of co.franchises) {
      counts.set(f.id, (counts.get(f.id) ?? 0) + 1);
    }
  }
  const shared = new Set<number>();
  for (const [id, count] of counts) {
    if (count >= 2) shared.add(id);
  }
  return shared;
}

/**
 * Partition co-members into franchise groups (by shared franchises)
 * plus an ungrouped remainder. Each co-member is assigned to exactly
 * one group — its first shared franchise by name order — so no movie
 * is duplicated across groups. Input order (year-sorted) is preserved
 * within each bucket.
 */
function groupCoMembersByFranchise(
  coMembers: CoMember[],
  sharedFranchiseIds: Set<number>,
): { groups: FranchiseGroup[]; ungrouped: CoMember[] } {
  const sharedFranchises: CoFranchise[] = [];
  const seenFranchiseIds = new Set<number>();
  for (const co of coMembers) {
    for (const f of co.franchises) {
      if (sharedFranchiseIds.has(f.id) && !seenFranchiseIds.has(f.id)) {
        sharedFranchises.push(f);
        seenFranchiseIds.add(f.id);
      }
    }
  }
  sharedFranchises.sort((a, b) => a.name.localeCompare(b.name, "ru"));

  const assigned = new Set<number>();
  const groups: FranchiseGroup[] = [];

  for (const franchise of sharedFranchises) {
    const members = coMembers.filter(
      (co) =>
        co.franchises.some((f) => f.id === franchise.id) &&
        !assigned.has(co.movieId),
    );
    if (members.length > 0) {
      groups.push({ franchise, members });
      for (const m of members) assigned.add(m.movieId);
    }
  }

  const ungrouped = coMembers.filter((co) => !assigned.has(co.movieId));
  return { groups, ungrouped };
}

export function MovieRemakes({
  memberships,
  currentMovieFranchises,
}: MovieRemakesProps) {
  const visible = memberships.filter((m) => m.coMembers.length > 0);
  if (visible.length === 0) return null;

  return (
    <section className="space-y-5">
      {visible.map((membership) => {
        const sortedCoMembers = sortByYearAsc(membership.coMembers);
        const sharedFranchiseIds = computeSharedFranchiseIds(
          currentMovieFranchises,
          sortedCoMembers,
        );
        const { groups, ungrouped } = groupCoMembersByFranchise(
          sortedCoMembers,
          sharedFranchiseIds,
        );

        return (
          <div key={membership.groupId} className="space-y-3">
            <div className="flex items-center gap-2">
              <GitFork className="h-3.5 w-3.5 text-neural" aria-hidden />
              <h2 className="font-mono-tech text-faint">связанные версии</h2>
              <span className="font-mono-tech text-faint/60 tabular-nums">
                {membership.groupSize}
              </span>
            </div>

            {/* Текущий фильм — контекст-якорь, не ссылка.
                Цветовая плашка повторяет бейдж роли текущего фильма. */}
            <div
              className={`rounded-[var(--radius-sm)] border border-l-2 px-3 py-2 ${REMAKE_ROLE_PANEL_TONE[membership.role]}`}
              aria-current="page"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="font-mono-tech text-[0.6rem] uppercase tracking-wider text-faint">
                  Этот фильм
                </span>
                <RemakeRoleBadge role={membership.role} size="sm" />
              </div>
            </div>

            {/* Кластеры по общей франшизе. Заголовок-ссылка + отступ,
                бейдж франшизы не повторяется в каждой строке. */}
            {groups.map((group) => (
              <div key={group.franchise.id} className="space-y-1">
                <Link
                  href={`/franchises/${group.franchise.slug}`}
                  className="focus-ring group inline-flex items-center gap-1.5 rounded-[var(--radius-sm)] px-1 py-0.5 text-[0.62rem] uppercase tracking-wider text-accent/80 transition-colors hover:text-accent"
                >
                  <Library className="h-3 w-3 text-accent" aria-hidden />
                  <span className="max-w-[14rem] truncate">
                    {group.franchise.name}
                  </span>
                  <ArrowUpRight
                    className="h-3 w-3 text-faint transition-colors group-hover:text-accent"
                    aria-hidden
                  />
                </Link>
                <ul className="ml-1 space-y-0.5 border-l border-accent/25 pl-3">
                  {group.members.map((co) => (
                    <li key={co.movieId}>
                      <div className="flex items-center gap-2 py-1">
                        <Link
                          href={`/movies/${co.movieSlug}`}
                          className="focus-ring group flex min-w-0 flex-1 items-center gap-1.5 text-sm text-text transition-colors hover:text-accent"
                        >
                          <ArrowUpRight
                            className="h-3.5 w-3.5 shrink-0 text-faint transition-colors group-hover:text-accent"
                            aria-hidden
                          />
                          <span className="min-w-0 truncate group-hover:text-accent">
                            {co.movieTitle}
                          </span>
                        </Link>
                        {co.movieYear ? (
                          <span className="font-mono-tech shrink-0 text-xs tabular-nums text-faint">
                            {co.movieYear}
                          </span>
                        ) : null}
                        <RemakeRoleBadge role={co.role} size="xs" />
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ))}

            {/* Версии без общей франшизы — простой плоский список. */}
            {ungrouped.length > 0 ? (
              <ul
                className={
                  groups.length > 0
                    ? "mt-1 space-y-0.5 border-t border-border-strong/40 pt-2"
                    : "space-y-0.5"
                }
              >
                {ungrouped.map((co) => (
                  <li key={co.movieId}>
                    <div className="flex items-center gap-2 py-1">
                      <Link
                        href={`/movies/${co.movieSlug}`}
                        className="focus-ring group flex min-w-0 flex-1 items-center gap-1.5 text-sm text-text transition-colors hover:text-accent"
                      >
                        <ArrowUpRight
                          className="h-3.5 w-3.5 shrink-0 text-faint transition-colors group-hover:text-accent"
                          aria-hidden
                        />
                        <span className="min-w-0 truncate group-hover:text-accent">
                          {co.movieTitle}
                        </span>
                      </Link>
                      {co.movieYear ? (
                        <span className="font-mono-tech shrink-0 text-xs tabular-nums text-faint">
                          {co.movieYear}
                        </span>
                      ) : null}
                      <RemakeRoleBadge role={co.role} size="xs" />
                    </div>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        );
      })}
    </section>
  );
}
