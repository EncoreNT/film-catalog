import Link from "next/link";
import { Library, PlusCircle } from "lucide-react";
import { EmptyState } from "@/components/primitives/EmptyState";

interface EmptyFranchisesProps {
  onCreate?: () => void;
}

export function EmptyFranchises({ onCreate }: EmptyFranchisesProps) {
  return (
    <EmptyState
      glowVariant="ember"
      icon={<Library className="h-9 w-9" />}
      eyebrow="франшиз пока нет"
      title={
        <>
          Соберите <em className="text-accent">франшизу</em>
        </>
      }
      description="Объединяйте фильмы во франшизы — отслеживайте, какие части есть в архиве, а какие ещё предстоит найти."
      action={
        onCreate ? (
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
        )
      }
    />
  );
}
