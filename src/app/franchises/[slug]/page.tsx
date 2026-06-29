import type { ReactNode } from "react";
import { ApiCoverImage } from "@/components/primitives/ApiCoverImage";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Clapperboard,
  MonitorPlay,
  Pencil,
  Sparkles,
  Sun,
  Waves,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { franchiseInclude } from "@/lib/franchise-include";
import { franchiseCoverUrlFromFranchise } from "@/lib/franchise-cover-url";
import { getFranchiseMetrics } from "@/lib/franchise-metrics";
import {
  countFilledSlots,
  countTotalSlots,
  pluralFilms,
} from "@/lib/franchise-utils";
import { FranchiseCompletionMeter } from "@/components/FranchiseCompletionMeter";
import { FranchiseSlotsView } from "@/components/FranchiseSlotsView";

interface PageProps {
  params: Promise<{ slug: string }>;
}

function HeroQualityStat({
  icon,
  count,
  total,
  label,
  elite = false,
}: {
  icon: ReactNode;
  count: number;
  total: number;
  label: string;
  elite?: boolean;
}) {
  const share = total ? Math.min(100, Math.round((count / total) * 100)) : 0;
  const hot = elite && count > 0;
  return (
    <div
      className={`flex items-center gap-2 rounded-[var(--radius-sm)] border px-2.5 py-1.5 backdrop-blur-sm transition-colors ${
        hot
          ? "border-accent/50 bg-accent/10"
          : "border-white/10 bg-bg-deep/60"
      }`}
      title={`${label}: ${count} из ${total} · ${share}%`}
    >
      <span
        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md ${
          hot ? "bg-accent/25 text-accent-bright" : "bg-accent/15 text-accent"
        }`}
        aria-hidden
      >
        {icon}
      </span>
      <span className="font-display text-sm font-bold leading-none tabular-nums text-text">
        {count}
        <span className="font-mono-tech text-faint"> / {total}</span>
      </span>
      <span className="font-mono-tech hidden text-[0.6rem] text-text/70 sm:block">
        {label}
      </span>
    </div>
  );
}

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  const franchise = await prisma.franchise.findUnique({
    where: { slug },
    select: { name: true },
  });
  return { title: franchise?.name ?? "Франшиза" };
}

export default async function FranchisePage({ params }: PageProps) {
  const { slug } = await params;

  const franchise = await prisma.franchise.findUnique({
    where: { slug },
    include: franchiseInclude,
  });

  if (!franchise) notFound();

  const metrics = await getFranchiseMetrics(franchise.id);

  const coverUrl = franchiseCoverUrlFromFranchise(franchise);
  const filled = countFilledSlots(franchise.slots);
  const total = countTotalSlots(franchise.slots);

  return (
    <div className="space-y-10">
      <section className="relative left-1/2 -translate-x-1/2 -mt-8 sm:-mt-12 w-screen overflow-hidden border-b border-border bg-bg-elevated">
        <div className="relative w-full aspect-[16/9] min-h-[300px] max-h-[680px]">
          {coverUrl ? (
            <ApiCoverImage
              src={coverUrl}
              alt={`Обложка: ${franchise.name}`}
              fill
              sizes="100vw"
              className="object-cover"
              priority
            />
          ) : (
            <div className="flex h-full items-center justify-center bg-gradient-to-br from-accent-soft to-transparent">
              <Clapperboard className="h-16 w-16 text-accent/30" aria-hidden />
            </div>
          )}
          <div className="pointer-events-none absolute inset-0 bg-bg-deep/30" aria-hidden />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-bg-deep via-bg-deep/85 to-transparent" aria-hidden />
          <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-bg-deep/80 to-transparent" aria-hidden />

          <div className="absolute inset-x-0 top-0">
            <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-4 px-6 sm:px-8 pt-6">
              <Link
                href="/franchises"
                className="focus-ring inline-flex items-center gap-2 rounded-[var(--radius)] bg-bg-deep/50 px-3 py-1.5 text-sm text-text/90 backdrop-blur-sm transition-colors hover:bg-bg-deep/70 hover:text-accent"
              >
                <ArrowLeft className="h-4 w-4" aria-hidden />
                К списку франшиз
              </Link>
              <Link
                href={`/franchises/${franchise.slug}/edit`}
                className="focus-ring inline-flex items-center gap-2 rounded-[var(--radius)] border border-white/15 bg-bg-deep/50 px-3.5 py-1.5 text-sm font-medium text-text backdrop-blur-sm transition-all duration-200 hover:border-accent/50 hover:text-accent"
              >
                <Pencil className="h-4 w-4" aria-hidden />
                Редактировать
              </Link>
            </div>
          </div>

          <div className="absolute inset-x-0 bottom-0">
            <div className="mx-auto w-full max-w-7xl px-6 sm:px-8 pb-8 sm:pb-10 pt-6">
              <div className="max-w-3xl space-y-4">
                <div>
                  <p className="font-mono-tech text-accent">
                    {total} {pluralFilms(total)}
                  </p>
                  <h1 className="font-display mt-1 text-4xl font-bold tracking-tight sm:text-5xl">
                    {franchise.name}
                  </h1>
                  {franchise.description ? (
                    <p className="mt-3 line-clamp-2 max-w-2xl text-sm leading-relaxed text-text/80">
                      {franchise.description}
                    </p>
                  ) : null}
                </div>

                {total > 0 ? (
                  <div className="space-y-3 border-t border-white/10 pt-4">
                    <div className="flex items-center gap-3">
                      <span className="font-mono-tech shrink-0 text-[0.6rem] uppercase tracking-wider text-text/70">
                        собрано
                      </span>
                      <FranchiseCompletionMeter
                        filled={filled}
                        total={total}
                        variant="inline"
                        className="min-w-0 flex-1"
                      />
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <HeroQualityStat
                        icon={<MonitorPlay className="h-3.5 w-3.5" />}
                        count={metrics.fourK}
                        total={total}
                        label="4K"
                      />
                      <HeroQualityStat
                        icon={<Sun className="h-3.5 w-3.5" />}
                        count={metrics.hdr10}
                        total={total}
                        label="HDR10 / HDR10+"
                      />
                      <HeroQualityStat
                        icon={<Waves className="h-3.5 w-3.5" />}
                        count={metrics.russianAtmos}
                        total={total}
                        label="рус. Atmos"
                      />
                      <HeroQualityStat
                        icon={<Sparkles className="h-3.5 w-3.5" />}
                        count={metrics.elite}
                        total={total}
                        label="4K + HDR + рус. Atmos"
                        elite
                      />
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </section>

      <FranchiseSlotsView
        franchiseId={franchise.id}
        slots={franchise.slots}
      />
    </div>
  );
}
