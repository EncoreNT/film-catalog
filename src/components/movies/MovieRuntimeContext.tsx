"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  resolveDetailRuntimeDisplay,
  type MovieRuntimeDisplay,
  type RuntimeDurationSlice,
} from "@/lib/movies/movie-runtime";

export type MovieRuntimeRelease = RuntimeDurationSlice & { id: number };

interface MovieRuntimeContextValue {
  setActiveReleaseId: (id: number) => void;
  display: MovieRuntimeDisplay;
  movieSeconds: number | null;
}

const MovieRuntimeContext = createContext<MovieRuntimeContextValue | null>(
  null,
);

export function MovieRuntimeProvider({
  movieSeconds,
  partCount,
  releases,
  initialActiveId,
  children,
}: {
  movieSeconds: number | null;
  partCount?: number | null;
  releases: MovieRuntimeRelease[];
  initialActiveId: number | null;
  children: ReactNode;
}) {
  const [activeId, setActiveId] = useState(initialActiveId);
  const setActiveReleaseId = useCallback((id: number) => {
    setActiveId(id);
  }, []);

  const display = useMemo(() => {
    const active =
      releases.find((release) => release.id === activeId) ?? null;
    return resolveDetailRuntimeDisplay({
      movieSeconds,
      activeRelease: active,
      lockToMovieRuntime: partCount != null && partCount > 1,
    });
  }, [activeId, movieSeconds, partCount, releases]);

  const value = useMemo(
    () => ({ setActiveReleaseId, display, movieSeconds }),
    [setActiveReleaseId, display, movieSeconds],
  );

  return (
    <MovieRuntimeContext.Provider value={value}>
      {children}
    </MovieRuntimeContext.Provider>
  );
}

export function useOptionalMovieRuntime(): MovieRuntimeContextValue | null {
  return useContext(MovieRuntimeContext);
}
