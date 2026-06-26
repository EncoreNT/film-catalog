"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Button } from "./primitives/Button";
import { ConfirmDialog } from "./primitives/ConfirmDialog";

interface FranchiseDeleteButtonProps {
  franchiseId: number;
  name: string;
}

export function FranchiseDeleteButton({
  franchiseId,
  name,
}: FranchiseDeleteButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/franchises/${franchiseId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "Не удалось удалить франшизу");
      }
      setOpen(false);
      router.push("/franchises");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button
        type="button"
        variant="danger"
        onClick={() => setOpen(true)}
        aria-label={`Удалить франшизу «${name}»`}
      >
        <Trash2 className="h-4 w-4" aria-hidden />
        Удалить
      </Button>

      <ConfirmDialog
        open={open}
        onClose={() => {
          setOpen(false);
          setError(null);
        }}
        onConfirm={handleDelete}
        loading={loading}
        title="Удалить франшизу?"
        description={
          <>
            Франшиза «{name}» и все её записи будут удалены безвозвратно.
            Фильмы в каталоге останутся — удаляется только сама франшиза.
            {error ? (
              <span className="mt-2 block text-danger" role="alert">
                {error}
              </span>
            ) : null}
          </>
        }
        confirmLabel="Удалить франшизу"
      />
    </>
  );
}
