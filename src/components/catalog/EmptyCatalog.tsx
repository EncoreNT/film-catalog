import Link from "next/link";
import { ScanSearch, Film, Sparkles } from "lucide-react";
import { EmptyState } from "@/components/primitives/EmptyState";

interface EmptyCatalogProps {
  isDraftView?: boolean;
}

export function EmptyCatalog({ isDraftView }: EmptyCatalogProps) {
  return (
    <EmptyState
      glowVariant="accent"
      icon={<Film className="h-9 w-9" />}
      eyebrow={isDraftView ? "очередь пуста" : "архив пуст"}
      title={
        isDraftView ? (
          <>Черновиков нет</>
        ) : (
          <>
            Поднимите <em className="text-accent">занавес</em>
          </>
        )
      }
      description={
        isDraftView
          ? "Запустите сканирование папки с фильмами — новые находки появятся здесь на проверку."
          : "Укажите папку с вашими фильмами, и каталог сам разложит хаос по полочкам: разрешения, звуковые дорожки, субтитры и обложки."
      }
      action={
        !isDraftView ? (
          <Link
            href="/scan"
            className="focus-ring group relative inline-flex min-h-12 items-center gap-2.5 overflow-hidden rounded-full bg-accent px-6 py-3 text-sm font-semibold text-bg-deep shadow-[0_0_32px_rgba(232,176,90,0.55)] transition-all duration-300 hover:bg-accent-bright hover:shadow-[0_0_48px_rgba(232,176,90,0.55)] active:scale-[0.97]"
          >
            <ScanSearch className="h-5 w-5" aria-hidden />
            Начать сканирование
            <span
              className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/30 to-transparent transition-transform duration-700 group-hover:translate-x-full"
              aria-hidden
            />
          </Link>
        ) : null
      }
      footer={
        !isDraftView ? (
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-faint">
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
        ) : undefined
      }
    />
  );
}
