"use client";

import { Check, Loader2 } from "lucide-react";
import type { ReactNode } from "react";

interface FormActionBarProps {
  isDirty?: boolean;
  /** Overrides default saved/dirty idle text (not shown while loading or when error is set). */
  idleMessage?: string;
  saving?: boolean;
  actionLoading?: boolean;
  error?: string | null;
  children: ReactNode;
}

export function FormActionBar({
  isDirty = false,
  idleMessage,
  saving = false,
  actionLoading = false,
  error = null,
  children,
}: FormActionBarProps) {
  const loading = saving || actionLoading;
  const savingLabel = actionLoading ? "выполнение…" : "сохранение…";

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-bg-deep/80 backdrop-blur-xl">
      <div className="container-wide flex flex-wrap items-center justify-between gap-3 px-6 py-3 lg:px-10 xl:px-14 2xl:px-20 3xl:px-24">
        <div className="flex min-w-0 items-center gap-2.5">
          {loading ? (
            <>
              <Loader2
                className="h-4 w-4 shrink-0 animate-spin text-accent"
                aria-hidden
              />
              <span className="font-mono-tech text-sm text-muted">
                {savingLabel}
              </span>
            </>
          ) : error ? (
            <span className="truncate text-sm text-danger" role="alert">
              {error}
            </span>
          ) : idleMessage ? (
            <span className="font-mono-tech text-sm text-muted">{idleMessage}</span>
          ) : isDirty ? (
            <>
              <span
                className="h-2 w-2 shrink-0 rounded-full bg-accent shadow-[0_0_8px_var(--accent-glow)]"
                aria-hidden
              />
              <span className="font-mono-tech text-sm text-accent">
                несохранённые изменения
              </span>
            </>
          ) : (
            <>
              <Check className="h-4 w-4 shrink-0 text-accent/70" aria-hidden />
              <span className="font-mono-tech text-sm text-muted">
                все изменения сохранены
              </span>
            </>
          )}
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {children}
        </div>
      </div>
    </div>
  );
}
