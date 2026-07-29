import Link from "next/link";
import { ArrowUpRight, GitFork } from "lucide-react";
import {
  RemakeRoleBadge,
  REMAKE_ROLE_PANEL_TONE,
} from "@/components/remakes/RemakeRoleBadge";
import type { MovieRemakeMembership } from "@/lib/remakes/remake-membership";

interface MovieRemakesProps {
  memberships: MovieRemakeMembership[];
}

export function MovieRemakes({ memberships }: MovieRemakesProps) {
  const visible = memberships.filter((m) => m.coMembers.length > 0);
  if (visible.length === 0) return null;

  return (
    <section className="space-y-4">
      {visible.map((membership) => (
        <div key={membership.groupId}>
          <div className="mb-3 flex items-center gap-2">
            <GitFork className="h-3.5 w-3.5 text-neural" aria-hidden />
            <h2 className="font-mono-tech text-faint">связанные версии</h2>
          </div>

          {/* Текущий фильм — якорь контекста, не ссылка */}
          <div
            className={`rounded-[var(--radius-sm)] border border-l-2 px-3 py-2.5 ${REMAKE_ROLE_PANEL_TONE[membership.role]}`}
            aria-current="page"
          >
            <div className="flex items-center justify-between gap-3">
              <p className="font-mono-tech text-[0.6rem] uppercase tracking-wider text-faint">
                Этот фильм
              </p>
              <RemakeRoleBadge role={membership.role} size="sm" />
            </div>
          </div>

          {membership.coMembers.length > 0 ? (
            <ul className="mt-4">
              <li
                aria-hidden
                className="font-mono-tech px-2 pb-1 text-[0.6rem] uppercase tracking-wider text-faint"
              >
                Перейти к
              </li>
              {membership.coMembers.map((co) => (
                <li key={co.movieId}>
                  <Link
                    href={`/movies/${co.movieSlug}`}
                    className="focus-ring group -mx-1 flex min-h-9 items-center gap-2 rounded-[var(--radius-sm)] px-2 py-1 text-sm text-muted transition-colors hover:bg-bg-surface-hover hover:text-text"
                  >
                      <ArrowUpRight
                        className="h-3.5 w-3.5 shrink-0 text-faint transition-colors group-hover:text-accent"
                        aria-hidden
                      />
                      <span className="min-w-0 flex-1 truncate group-hover:text-accent">
                        {co.movieTitle}
                      </span>
                      {co.movieYear ? (
                        <span className="font-mono-tech shrink-0 text-xs text-faint">
                          {co.movieYear}
                        </span>
                      ) : null}
                      <RemakeRoleBadge role={co.role} size="xs" />
                    </Link>
                  </li>
                ))}
            </ul>
          ) : null}
        </div>
      ))}
    </section>
  );
}
