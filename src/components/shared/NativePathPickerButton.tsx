"use client";

import { useState } from "react";
import { FolderOpen, LoaderCircle } from "lucide-react";
import { Button } from "@/components/primitives/Button";
import { apiFetch } from "@/lib/api/client";

interface NativePathPickerButtonProps {
  kind: "file" | "directory";
  onPick: (runtimePath: string, displayPath: string) => void;
  onError: (error: string | null) => void;
  onPickingChange?: (picking: boolean) => void;
  disabled?: boolean;
  className?: string;
  textClassName?: string;
}

export function NativePathPickerButton({
  kind,
  onPick,
  onError,
  onPickingChange,
  disabled,
  className,
  textClassName,
}: NativePathPickerButtonProps) {
  const [picking, setPicking] = useState(false);
  const label = kind === "file" ? "Выбрать файл" : "Выбрать папку";
  const pick = async () => {
    setPicking(true);
    onPickingChange?.(true);
    onError(null);
    try {
      const data = await apiFetch<{
        cancelled?: boolean;
        path?: string;
        pathDisplay?: string;
      }>(
        kind === "file" ? "/api/pick-file" : "/api/pick-directory",
        { method: "POST" },
        kind === "file"
          ? "Не удалось выбрать файл"
          : "Не удалось выбрать папку",
      );
      if (data.cancelled) return;
      if (!data.path || !data.pathDisplay)
        throw new Error("Сервер не вернул выбранный путь");
      onPick(data.path, data.pathDisplay);
    } catch (err) {
      onError(
        err instanceof Error ? err.message : "Не удалось открыть диалог выбора",
      );
    } finally {
      setPicking(false);
      onPickingChange?.(false);
    }
  };
  return (
    <Button
      type="button"
      variant="ghost"
      onClick={() => void pick()}
      disabled={disabled || picking}
      title={label}
      aria-label={label}
      className={className}
    >
      {picking ? (
        <LoaderCircle className="h-3.5 w-3.5 animate-spin" aria-hidden />
      ) : (
        <FolderOpen className="h-3.5 w-3.5" aria-hidden />
      )}
      <span className={textClassName}>Обзор</span>
    </Button>
  );
}
