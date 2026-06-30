"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Library } from "lucide-react";
import { Button } from "./primitives/Button";
import { ConfirmDialog } from "./primitives/ConfirmDialog";

interface MovieApproveButtonProps {
  movieId: number;
  title: string;
}

export function MovieApproveButton({ movieId, title }: MovieApproveButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleApprove = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/movies/${movieId}/approve`, { method: "POST" });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "Не удалось опубликовать фильм");
      }
      setOpen(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button type="button" variant="primary" onClick={() => setOpen(true)}>
        <Library className="h-4 w-4" aria-hidden />
        В каталог
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
        title="Опубликовать в каталоге?"
        description={
          <>
            «{title}» появится в каталоге и будет виден на главной.
            {error ? (
              <span className="mt-2 block text-danger" role="alert">
                {error}
              </span>
            ) : null}
          </>
        }
        confirmLabel="В каталог"
      />
    </>
  );
}
