import Link from "next/link";
import { Library, PlusCircle } from "lucide-react";

interface EmptyFranchisesProps {
  onCreate?: () => void;
}

export function EmptyFranchises({ onCreate }: EmptyFranchisesProps) {
  return (
    <section className="relative mt-12">
      <div className="film-perfs h-4 w-full opacity-60" aria-hidden />

      <div className="relative overflow-hidden rounded-[var(--radius)] border border-border-strong bg-gradient-to-b from-bg-surface to-transparent">
        <div
          className="pointer-events-none absolute inset-0 opacity-70"
          aria-hidden
          style={{
            background:
              "radial-gradient(ellipse 60% 50% at 50% 0%, var(--ember-glow) 0%, transparent 70%)",
          }}
        />

        <div className="relative flex flex-col items-center gap-6 px-6 py-20 text-center sm:py-28">
          <div className="flex h-20 w-20 items-center justify-center rounded-full border border-border-strong bg-gradient-to-br from-ember/10 to-transparent shadow-[0_0_40px_var(--ember-glow)]">
            <Library className="h-9 w-9 text-ember" aria-hidden />
          </div>

          <div className="space-y-3">
            <p className="font-mono-tech text-ember">франшиз пока нет</p>
            <h2 className="font-display text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
              Соберите <em className="text-accent">франшизу</em>
            </h2>
            <p className="mx-auto max-w-lg text-base leading-relaxed text-muted">
              Объединяйте фильмы во франшизы — отслеживайте, какие части есть в
              архиве, а какие ещё предстоит найти.
            </p>
          </div>

          {onCreate ? (
            <button
              type="button"
              onClick={onCreate}
              className="focus-ring group inline-flex min-h-12 cursor-pointer items-center gap-2.5 rounded-[var(--radius)] bg-accent px-6 py-3 text-sm font-semibold text-bg-deep shadow-[0_0_32px_var(--accent-glow)] transition-all duration-300 hover:bg-accent-bright"
            >
              <PlusCircle className="h-5 w-5" aria-hidden />
              Создать франшизу
            </button>
          ) : (
            <Link
              href="/franchises"
              className="focus-ring inline-flex min-h-12 items-center gap-2.5 rounded-[var(--radius)] bg-accent px-6 py-3 text-sm font-semibold text-bg-deep"
            >
              <PlusCircle className="h-5 w-5" aria-hidden />
              К списку франшиз
            </Link>
          )}
        </div>
      </div>

      <div className="film-perfs mt-px h-4 w-full opacity-60" aria-hidden />
    </section>
  );
}
