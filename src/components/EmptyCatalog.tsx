import Link from "next/link";
import { ScanSearch, Film, Sparkles } from "lucide-react";

interface EmptyCatalogProps {
  isDraftView?: boolean;
}

export function EmptyCatalog({ isDraftView }: EmptyCatalogProps) {
  return (
    <section className="relative mt-12">
      {/* Film perforation top strip */}
      <div
        className="film-perfs h-4 w-full opacity-60"
        aria-hidden
        style={{ color: "var(--bg-base)" }}
      />

      <div className="relative overflow-hidden rounded-[var(--radius)] border border-border-strong bg-gradient-to-b from-bg-surface to-transparent">
        {/* Inner glow */}
        <div
          className="pointer-events-none absolute inset-0 opacity-70"
          aria-hidden
          style={{
            background:
              "radial-gradient(ellipse 60% 50% at 50% 0%, var(--accent-glow) 0%, transparent 70%)",
          }}
        />

        <div className="relative flex flex-col items-center gap-6 px-6 py-20 text-center sm:py-28">
          <div
            className="flex h-20 w-20 items-center justify-center rounded-full border border-border-strong bg-gradient-to-br from-accent-soft to-transparent shadow-[0_0_40px_var(--accent-glow)]"
          >
            <Film className="h-9 w-9 text-accent" aria-hidden />
          </div>

          <div className="space-y-3">
            <p className="font-mono-tech text-accent">
              {isDraftView ? "очередь пуста" : "архив пуст"}
            </p>
            <h2 className="font-display text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
              {isDraftView ? (
                <>Черновиков нет</>
              ) : (
                <>
                  Поднимите <em className="text-accent">занавес</em>
                </>
              )}
            </h2>
            <p className="mx-auto max-w-lg text-base leading-relaxed text-muted">
              {isDraftView
                ? "Запустите сканирование папки с фильмами — новые находки появятся здесь на проверку."
                : "Укажите папку с вашими фильмами, и каталог сам разложит хаос по полочкам: разрешения, звуковые дорожки, субтитры и обложки."}
            </p>
          </div>

          {!isDraftView ? (
            <Link
              href="/scan"
              className="focus-ring group inline-flex min-h-12 items-center gap-2.5 rounded-[var(--radius)] bg-accent px-6 py-3 text-sm font-semibold text-bg-deep shadow-[0_0_32px_var(--accent-glow)] transition-all duration-300 hover:bg-accent-bright hover:shadow-[0_0_48px_var(--accent-glow)]"
            >
              <ScanSearch className="h-5 w-5" aria-hidden />
              Начать сканирование
            </Link>
          ) : null}

          {!isDraftView ? (
            <div className="mt-4 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-faint">
              <span className="flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-accent/60" aria-hidden />
                автоопределение качества
              </span>
              <span className="flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-accent/60" aria-hidden />
                звуковые дорожки и языки
              </span>
              <span className="flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-accent/60" aria-hidden />
                обложки локально
              </span>
            </div>
          ) : null}
        </div>
      </div>

      {/* Film perforation bottom strip */}
      <div className="film-perfs mt-px h-4 w-full opacity-60" aria-hidden />
    </section>
  );
}
