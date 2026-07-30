"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/primitives/Button";
import { ConfirmDialog } from "@/components/primitives/ConfirmDialog";
import { approveMovie } from "@/lib/api/client";

interface MovieApproveButtonProps {
  movieId: number;
  title: string;
  /** Компактный вид для шапки карточки фильма. */
  compact?: boolean;
  /** Вернуть из «Исключённых», а не опубликовать черновик. */
  restoreFromExcluded?: boolean;
}

export function MovieApproveButton({
  movieId,
  title,
  compact = false,
  restoreFromExcluded = false,
}: MovieApproveButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleApprove = async () => {
    setLoading(true);
    setError(null);
    try {
      await approveMovie(movieId);
      setOpen(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setLoading(false);
    }
  };

  const actionLabel = restoreFromExcluded ? "Вернуть в каталог" : "В каталог";

  return (
    <>
      <Button
        type="button"
        variant="secondary"
        onClick={() => setOpen(true)}
        className={
          compact
            ? "font-mono-tech min-h-8 px-3 py-1.5 text-[11px] tracking-wide"
            : undefined
        }
      >
        {actionLabel}
      </Button>

      <ConfirmDialog
        open={open}
        onClose={() => {
          setOpen(false);
          setError(null);
        }}
        onConfirm={handleApprove}
        loading={loading}
        tone="accent"
        title={
          restoreFromExcluded
            ? "Вернуть фильм в каталог?"
            : "Опубликовать в каталоге?"
        }
        description={
          <>
            {restoreFromExcluded ? (
              <>
                «{title}» снова появится в основном каталоге на главной.
              </>
            ) : (
              <>«{title}» появится в каталоге и будет виден на главной.</>
            )}
            {error ? (
              <span className="mt-2 block text-danger" role="alert">
                {error}
              </span>
            ) : null}
          </>
        }
        confirmLabel={actionLabel}
      />
    </>
  );
}
