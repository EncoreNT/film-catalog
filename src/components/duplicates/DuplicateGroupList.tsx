import Link from "next/link";
import type { DuplicateGroup } from "@/lib/merge/alternative-quality";
import { pluralRu } from "@/lib/shared/russian-plural";

interface DuplicateGroupListProps {
  groups: DuplicateGroup[];
}

export function DuplicateGroupList({ groups }: DuplicateGroupListProps) {
  if (groups.length === 0) {
    return (
      <div className="surface-card p-6 text-sm text-muted">
        Подозрительных дублей не найдено.
      </div>
    );
  }

  return (
    <ul className="space-y-4">
      {groups.map((group) => (
        <li key={group.matchKey} className="surface-card p-5">
          <p className="font-mono-tech text-xs text-faint">{group.matchKey}</p>
          <ul className="mt-3 space-y-2">
            {group.movies.map((movie) => (
              <li
                key={movie.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-[var(--radius)] border border-border bg-bg-elevated px-3 py-2"
              >
                <div>
                  <Link
                    href={`/movies/${movie.slug}`}
                    className="text-sm font-medium text-text hover:text-accent"
                  >
                    {movie.title}
                    {movie.year ? ` (${movie.year})` : ""}
                  </Link>
                  <p className="font-mono-tech mt-0.5 text-xs text-muted">
                    {movie.status.toLowerCase()} · {movie._count.releases}{" "}
                    {pluralRu(
                      movie._count.releases,
                      "релиз",
                      "релиза",
                      "релизов",
                    )}
                  </p>
                </div>
                {group.movies.length >= 2 ? (
                  <span className="text-xs text-muted">
                    Откройте карточку и нажмите «Объединить»
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        </li>
      ))}
    </ul>
  );
}
