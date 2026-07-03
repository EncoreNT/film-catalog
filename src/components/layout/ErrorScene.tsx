import type { ReactNode } from "react";
import Link from "next/link";
import { Film, ArrowLeft, RefreshCw } from "lucide-react";

export interface ErrorSceneFrameProps {
  code: string;
  eyebrow: string;
  title: ReactNode;
  description: ReactNode;
  actions: ReactNode;
  className?: string;
}

export function ErrorSceneFrame({
  code,
  eyebrow,
  title,
  description,
  actions,
  className = "error-scene-in relative -mx-4 my-6 sm:-mx-6",
}: ErrorSceneFrameProps) {
  return (
    <div className={className}>
      <div
        className="film-perfs-y absolute inset-y-0 left-0 w-6 opacity-50 sm:left-6"
        aria-hidden
      />
      <div
        className="film-perfs-y absolute inset-y-0 right-0 w-6 opacity-50 sm:right-6"
        aria-hidden
      />

      <div className="relative mx-auto flex max-w-3xl flex-col items-center px-10 py-20 text-center sm:py-28">
        <div className="relative mb-10">
          <div
            className="pointer-events-none absolute inset-0 -z-10 rounded-full blur-2xl"
            aria-hidden
            style={{
              background:
                "radial-gradient(circle, var(--accent-glow) 0%, transparent 65%)",
            }}
          />
          <span className="lamp-flicker flex h-16 w-16 items-center justify-center rounded-full border border-border-strong bg-gradient-to-br from-accent-soft to-transparent shadow-[0_0_36px_var(--accent-glow)]">
            <Film className="h-7 w-7 text-accent" aria-hidden />
          </span>
        </div>

        <p className="font-mono-tech mb-6 text-accent">{eyebrow}</p>

        <div className="relative">
          <p
            className="error-code-glow font-display select-none text-[7rem] font-bold leading-none tracking-tight text-text sm:text-[10rem]"
            aria-hidden
          >
            {code}
          </p>
        </div>

        <div className="my-8 flex w-full max-w-sm items-center gap-3" aria-hidden>
          <span className="h-px flex-1 bg-gradient-to-r from-transparent to-border" />
          <span className="h-1.5 w-1.5 rounded-full bg-accent shadow-[0_0_12px_var(--accent-glow)]" />
          <span className="h-px flex-1 bg-gradient-to-l from-transparent to-border" />
        </div>

        <h1 className="font-display max-w-xl text-3xl font-semibold leading-tight tracking-tight text-text sm:text-4xl">
          {title}
        </h1>

        <p className="mt-4 max-w-md text-base leading-relaxed text-muted">
          {description}
        </p>

        <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row">
          {actions}
        </div>
      </div>
    </div>
  );
}

interface ErrorSceneProps {
  code: string;
  eyebrow: string;
  title: ReactNode;
  description: ReactNode;
  retryLabel?: string;
  onRetry?: () => void;
}

export function ErrorScene({
  code,
  eyebrow,
  title,
  description,
  retryLabel,
  onRetry,
}: ErrorSceneProps) {
  return (
    <ErrorSceneFrame
      code={code}
      eyebrow={eyebrow}
      title={title}
      description={description}
      actions={
        <>
          <Link
            href="/"
            className="focus-ring group inline-flex min-h-12 items-center gap-2.5 rounded-[var(--radius)] bg-accent px-6 py-3 text-sm font-semibold text-bg-deep shadow-[0_0_28px_var(--accent-glow)] transition-all duration-300 hover:bg-accent-bright hover:shadow-[0_0_44px_var(--accent-glow)]"
          >
            <ArrowLeft className="h-4 w-4 transition-transform duration-300 group-hover:-translate-x-0.5" aria-hidden />
            В каталог
          </Link>
          {retryLabel && onRetry ? (
            <button
              type="button"
              onClick={onRetry}
              className="focus-ring inline-flex min-h-12 cursor-pointer items-center gap-2.5 rounded-[var(--radius)] border border-border-strong bg-bg-surface px-6 py-3 text-sm font-medium text-text transition-all duration-300 hover:border-accent/50 hover:text-accent hover:bg-bg-surface-hover"
            >
              <RefreshCw className="h-4 w-4" aria-hidden />
              {retryLabel}
            </button>
          ) : null}
        </>
      }
    />
  );
}
