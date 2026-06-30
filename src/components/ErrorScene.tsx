import type { ReactNode } from "react";
import Link from "next/link";
import { Film, ArrowLeft, RefreshCw } from "lucide-react";

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
    <div className="error-scene-in surface-screen relative my-6 overflow-hidden rounded-[var(--radius)] border border-border bg-bg-deep">
      {/* Sprocket-rail frame: two vertical perforation strips bracket the whole scene,
          like a strip of film pulled out of the projector */}
      <div
        className="film-perfs-y absolute inset-y-0 left-0 w-6 opacity-50 sm:left-6"
        aria-hidden
      />
      <div
        className="film-perfs-y absolute inset-y-0 right-0 w-6 opacity-50 sm:right-6"
        aria-hidden
      />

      <div className="relative mx-auto flex max-w-3xl flex-col items-center px-10 py-20 text-center sm:py-28">
        {/* Projector lamp — the only thing left glowing when the reel snaps */}
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

        {/* Slate header — uppercase mono, like a clapperboard take label */}
        <p className="font-mono-tech mb-6 text-accent">{eyebrow}</p>

        {/* The error code, set in the display serif at architectural scale,
            bathed in warm projector glow */}
        <div className="relative">
          <p
            className="error-code-glow font-display select-none text-[7rem] font-bold leading-none tracking-tight text-text sm:text-[10rem]"
            aria-hidden
          >
            {code}
          </p>
        </div>

        {/* Hairline divider with a single gold tick — the frame break */}
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

        {/* Actions — primary solid gold "to the catalog" mirrors the Скан button family;
            secondary bordered retry matches the ghost/secondary button language */}
        <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row">
          <Link
            href="/"
            className="focus-ring group inline-flex min-h-12 items-center gap-2.5 rounded-[var(--radius)] bg-accent px-6 py-3 text-sm font-semibold text-on-accent shadow-[0_0_28px_var(--accent-glow)] transition-all duration-300 hover:bg-accent-bright hover:shadow-[0_0_44px_var(--accent-glow)]"
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
        </div>
      </div>
    </div>
  );
}
