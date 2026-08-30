import Link from "next/link";
import { Disc3, Plus } from "lucide-react";
import { SpotlightTier } from "@/components/layout/SpotlightTier";
import { MachinedCard, CardSectionHeader } from "@/components/primitives/MachinedCard";
import { buttonClassName } from "@/components/primitives/Button";

interface EmptyReleasesCardProps {
  movieSlug: string;
}

export function EmptyReleasesCard({ movieSlug }: EmptyReleasesCardProps) {
  return (
    <MachinedCard variant="calm" bodyClassName="space-y-4">
      <SpotlightTier tier="standard" />
      <CardSectionHeader
        label="нет релизов"
        title="Сюда ещё не положили файл"
      />
      <p className="text-sm text-muted">
        Карточка фильма уже в базе. Релиз появится после сборки или ручного
        добавления файла.
      </p>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Link
          href={`/movies/${movieSlug}/releases/from-bdmv`}
          className={buttonClassName("primary", "min-h-11")}
        >
          <Disc3 className="h-4 w-4" aria-hidden />
          Собрать из BDMV файлов
        </Link>
        <Link
          href={`/movies/${movieSlug}/releases/new`}
          className={buttonClassName("secondary", "min-h-11")}
        >
          <Plus className="h-4 w-4" aria-hidden />
          Добавить готовый файл
        </Link>
      </div>
    </MachinedCard>
  );
}
