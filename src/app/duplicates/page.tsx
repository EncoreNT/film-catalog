import Link from "next/link";
import { findAllDuplicateGroups } from "@/lib/alternative-quality";

export default async function DuplicatesPage() {
  const groups = await findAllDuplicateGroups();

  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-display text-3xl font-bold">Возможные дубли</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted">
          Фильмы с одинаковым названием и годом. Объедините их, чтобы собрать
          все релизы в одной карточке каталога.
        </p>
      </header>

      {groups.length === 0 ? (
        <div className="surface-card p-6 text-sm text-muted">
          Подозрительных дублей не найдено.
        </div>
      ) : (
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
                        {movie._count.releases === 1 ? "релиз" : "релиза"}
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
      )}
    </div>
  );
}
