"use client";

import { Clapperboard } from "lucide-react";
import { InfoHint } from "@/components/primitives/InfoHint";
import { useOptionalMovieRuntime } from "@/components/movies/MovieRuntimeContext";
import { formatDuration, formatDurationDelta } from "@/lib/shared/duration-format";
import type { MovieRuntimeDisplay } from "@/lib/movies/movie-runtime";

function runtimeHint(movieSeconds: number | null): string {
  const theatrical = formatDuration(movieSeconds, "long");
  if (theatrical) {
    return `Это время выбранной версии, не фильма. Театральная длится ${theatrical}.`;
  }
  return "Это время выбранной версии, не фильма.";
}

export function MovieRuntimeMeta({
  fallbackSeconds,
}: {
  fallbackSeconds: number | null;
}) {
  const runtime = useOptionalMovieRuntime();
  const display: MovieRuntimeDisplay = runtime?.display ?? {
    seconds: fallbackSeconds,
    source: "movie",
    cutLabel: null,
    deltaSeconds: null,
  };
  const formatted = formatDuration(display.seconds, "long");
  if (!formatted) return null;

  const isCut = display.source === "cut";
  const delta =
    display.deltaSeconds != null && display.deltaSeconds !== 0
      ? `${display.deltaSeconds > 0 ? "+" : "-"}${formatDurationDelta(Math.abs(display.deltaSeconds))}`
      : null;
  const cutName = display.cutLabel ?? "версия";

  if (!isCut) {
    return <span>{formatted}</span>;
  }

  return (
    <span className="inline-flex items-center gap-1.5" aria-live="polite">
      <span
        className="inline-flex items-center gap-1.5 rounded-full border border-ember/45 bg-bg-deep/90 py-0.5 pl-1.5 pr-2 text-ember-bright"
        title={runtimeHint(runtime?.movieSeconds ?? null)}
      >
        <Clapperboard className="h-3 w-3 shrink-0" strokeWidth={1.75} aria-hidden />
        <span className="tabular-nums">{formatted}</span>
        {delta ? (
          <span className="text-[10px] tracking-[0.12em] text-ember">
            {delta}
          </span>
        ) : null}
      </span>
      <InfoHint
        label={`Длительность: ${cutName}`}
        text={runtimeHint(runtime?.movieSeconds ?? null)}
      />
    </span>
  );
}
