"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Wand2, Layers } from "lucide-react";
import type { ReleaseWithTracks } from "@/lib/movies/movie-include";
import { Button } from "@/components/primitives/Button";
import { FormActionBar } from "@/components/primitives/FormActionBar";
import {
  MachinedCard,
  CardSectionHeader,
} from "@/components/primitives/MachinedCard";
import { InfoHint } from "@/components/primitives/InfoHint";
import { useStoragePicker } from "@/hooks/useStoragePicker";
import { apiFetch } from "@/lib/api/client";
import type { BuildCapabilities } from "@/lib/builds/build-capabilities";
import {
  applyTrackPatch,
  createInitialBuildState,
  normalizeExclusiveDefaults,
  serializeBuildRecipe,
  type BuildRecipeFormState,
  type BuildRecipeTrackState,
} from "@/lib/builds/build-recipe-state";
import {
  BuildSourceDecks,
  sourceTrackKey,
} from "@/components/builds/BuildSourceDecks";
import { BuildReel } from "@/components/builds/BuildReel";
import { BuildOutputPanel } from "@/components/builds/BuildOutputPanel";
import { BuildCapabilitiesPanel } from "@/components/builds/BuildCapabilitiesPanel";
import { sourceTrackLabel } from "@/lib/builds/build-display";
import { estimateBuildOutputSizeFromRecipe } from "@/lib/builds/build-output-size";
import { suggestBuildOutputPath } from "@/lib/builds/build-filename";
import { pickPrimaryRelease } from "@/lib/releases/release-primary";

interface ReleaseBuildEditorProps {
  movieId: number;
  movieTitle: string;
  movieYear: number | null;
  releases: ReleaseWithTracks[];
}

interface ValidationResult {
  ok: boolean;
  warnings: { code: string; message: string; severity: string }[];
  errors?: { code: string; message: string; severity: string }[];
  error?: string;
}

const DURATION_HINT_THRESHOLD = 1;

function buildTrackFromSource(
  releases: ReleaseWithTracks[],
  releaseId: number,
  kind: BuildRecipeTrackState["kind"],
  streamIndex: number,
): BuildRecipeTrackState | null {
  const release = releases.find((r) => r.id === releaseId);
  if (!release) return null;
  if (kind === "video") {
    if (!release.videoTrack || release.videoTrack.streamIndex !== streamIndex) return null;
    return {
      key: crypto.randomUUID(),
      kind: "video",
      sourceReleaseId: releaseId,
      sourceStreamIndex: streamIndex,
      label: sourceTrackLabel(release.videoTrack, "video"),
    };
  }
  if (kind === "audio") {
    const a = release.audioTracks.find((t) => t.streamIndex === streamIndex);
    if (!a) return null;
    return {
      key: crypto.randomUUID(),
      kind: "audio",
      sourceReleaseId: releaseId,
      sourceStreamIndex: streamIndex,
      label: sourceTrackLabel(a, "audio"),
      audioMode: "copy",
      offsetMs: 0,
      transcodeCodec: "eac3",
      transcodeBitrate: 768,
      channelTarget: "up_to_51",
      isDefault: false,
    };
  }
  const s = release.subtitleTracks.find((t) => t.streamIndex === streamIndex);
  if (!s) return null;
  return {
    key: crypto.randomUUID(),
    kind: "subtitle",
    sourceReleaseId: releaseId,
    sourceStreamIndex: streamIndex,
    label: sourceTrackLabel(s, "subtitle"),
    forced: s.forced,
    isDefault: s.isDefault,
  };
}

export function ReleaseBuildEditor({
  movieId,
  movieTitle,
  movieYear,
  releases,
}: ReleaseBuildEditorProps) {
  const router = useRouter();
  const [state, setState] = useState<BuildRecipeFormState>(() =>
    createInitialBuildState(releases),
  );
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [ackWarnings, setAckWarnings] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [capabilities, setCapabilities] = useState<BuildCapabilities | null>(null);

  const storage = useStoragePicker(
    releases.find((r) => r.id === state.externalStorageId)?.externalStorage ?? null,
  );

  useEffect(() => {
    let cancelled = false;
    apiFetch<BuildCapabilities>("/api/builds/capabilities")
      .then((cap) => {
        if (!cancelled) setCapabilities(cap);
      })
      .catch(() => {
        if (!cancelled) setCapabilities(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/settings")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { mediaSaveDir?: string | null } | null) => {
        if (cancelled || !data?.mediaSaveDir) return;
        setState((current) => {
          if (current.outputPath.trim()) return current;
          const primary = pickPrimaryRelease(releases);
          const suggested = suggestBuildOutputPath(data.mediaSaveDir!, {
            movieTitle,
            movieYear,
            releaseType: current.outputReleaseType,
            version: current.outputVersion,
            resolutionLabel: primary?.videoTrack?.resolutionLabel,
            hdr: primary?.videoTrack?.hdr,
          });
          return { ...current, outputPath: suggested };
        });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [movieTitle, movieYear, releases]);

  const toolsOk =
    capabilities != null &&
    capabilities.ffmpeg.available &&
    capabilities.ffprobe.available &&
    capabilities.mkvmerge.available;

  const inReel = useMemo(
    () =>
      new Set(
        state.tracks.map((t) =>
          sourceTrackKey(t.sourceReleaseId, t.kind, t.sourceStreamIndex),
        ),
      ),
    [state.tracks],
  );

  const activeVideoKey = useMemo(() => {
    const v = state.tracks.find((t) => t.kind === "video");
    return v ? sourceTrackKey(v.sourceReleaseId, "video", v.sourceStreamIndex) : null;
  }, [state.tracks]);

  // Client-side duration heuristic: flag an audio track when its source
  // release duration differs from the video source release duration.
  const durationMismatchKeys = useMemo(() => {
    const video = state.tracks.find((t) => t.kind === "video");
    if (!video) return new Set<string>();
    const videoRelease = releases.find((r) => r.id === video.sourceReleaseId);
    const videoDuration = videoRelease?.durationSeconds ?? null;
    if (videoDuration == null) return new Set<string>();
    const flags = new Set<string>();
    for (const t of state.tracks) {
      if (t.kind !== "audio") continue;
      const audioRelease = releases.find((r) => r.id === t.sourceReleaseId);
      const audioDuration = audioRelease?.durationSeconds ?? null;
      if (audioDuration == null) continue;
      if (Math.abs(audioDuration - videoDuration) > DURATION_HINT_THRESHOLD) {
        flags.add(sourceTrackKey(t.sourceReleaseId, "audio", t.sourceStreamIndex));
      }
    }
    return flags;
  }, [state.tracks, releases]);

  const resetValidation = useCallback(() => {
    setValidation(null);
    setAckWarnings(false);
  }, []);

  const handlePick = useCallback(
    (releaseId: number, kind: BuildRecipeTrackState["kind"], streamIndex: number) => {
      setState((current) => {
        const existingIndex = current.tracks.findIndex(
          (t) =>
            t.kind === kind &&
            t.sourceReleaseId === releaseId &&
            t.sourceStreamIndex === streamIndex,
        );

        if (kind === "video") {
          // Видео — один слот: повторный клик по текущему источнику ничего не делает.
          if (existingIndex >= 0) return current;
          const track = buildTrackFromSource(releases, releaseId, kind, streamIndex);
          if (!track) return current;
          const withoutVideo = current.tracks.filter((t) => t.kind !== "video");
          return { ...current, tracks: [track, ...withoutVideo] };
        }

        // Аудио и субтитры — переключатель: в сборке → убрать, нет → добавить.
        if (existingIndex >= 0) {
          return {
            ...current,
            tracks: current.tracks.filter((_, i) => i !== existingIndex),
          };
        }

        const track = buildTrackFromSource(releases, releaseId, kind, streamIndex);
        if (!track) return current;

        const order: Record<BuildRecipeTrackState["kind"], number> = {
          video: 0,
          audio: 1,
          subtitle: 2,
        };
        const next = [...current.tracks, track];
        next.sort((a, b) => order[a.kind] - order[b.kind]);
        return { ...current, tracks: normalizeExclusiveDefaults(next) };
      });
      resetValidation();
    },
    [releases, resetValidation],
  );

  const handleVideoReleaseChange = useCallback(
    (releaseId: number) => {
      setState((current) => {
        const release = releases.find((r) => r.id === releaseId);
        const video = release?.videoTrack;
        if (!video) return current;
        const track = buildTrackFromSource(releases, releaseId, "video", video.streamIndex);
        if (!track) return current;
        const withoutVideo = current.tracks.filter((t) => t.kind !== "video");
        return { ...current, tracks: [track, ...withoutVideo] };
      });
      resetValidation();
    },
    [releases, resetValidation],
  );

  const handleTrackChange = useCallback(
    (index: number, patch: Partial<BuildRecipeTrackState>) => {
      setState((current) => ({
        ...current,
        tracks: applyTrackPatch(current.tracks, index, patch),
      }));
      resetValidation();
    },
    [resetValidation],
  );

  const handleTrackRemove = useCallback((index: number) => {
    setState((current) => ({
      ...current,
      tracks: current.tracks.filter((_, i) => i !== index),
    }));
    resetValidation();
  }, [resetValidation]);

  const handleReorder = useCallback((tracks: BuildRecipeTrackState[]) => {
    setState((current) => ({ ...current, tracks }));
    resetValidation();
  }, [resetValidation]);

  const handleValidate = async () => {
    setLoading(true);
    setError(null);
    try {
      const externalStorageId = await storage.resolveExternalStorageId();
      const payload = serializeBuildRecipe({ ...state, externalStorageId });
      const res = await fetch(`/api/movies/${movieId}/builds/validate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json().catch(() => null)) as ValidationResult | null;
      if (!data) {
        setError("Не удалось прочитать ответ проверки");
        setValidation(null);
        return;
      }
      setValidation(data);
      setAckWarnings(false);
      if (!data.ok && data.error) setError(data.error);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
      setValidation(null);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    try {
      const externalStorageId = await storage.resolveExternalStorageId();
      const payload = {
        ...serializeBuildRecipe({ ...state, externalStorageId }),
        acknowledgeWarnings:
          (validation?.warnings?.length ?? 0) > 0 ? ackWarnings : undefined,
      };
      const res = await fetch(`/api/movies/${movieId}/builds`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.status === 201) {
        const created = (await res.json().catch(() => null)) as { id?: number } | null;
        if (created?.id) {
          router.push(`/builds/${created.id}`);
          return;
        }
        setError("Сборка поставлена, но ответ без id");
        return;
      }
      // 400 carries structured validation errors — surface them in the panel.
      const data = (await res.json().catch(() => null)) as
        | (ValidationResult & { error?: string })
        | null;
      if (data) {
        setValidation({
          ok: false,
          error: data.error,
          errors: data.errors,
          warnings: data.warnings ?? [],
        });
        setAckWarnings(false);
        setError(data.error ?? "Не удалось поставить сборку в очередь");
      } else {
        setError("Не удалось поставить сборку в очередь");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setLoading(false);
    }
  };

  const hasVideo = state.tracks.some((t) => t.kind === "video");
  const handleSuggestPath = useCallback(() => {
    void fetch("/api/settings")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { mediaSaveDir?: string | null } | null) => {
        if (!data?.mediaSaveDir) {
          setError("Папка сохранения не настроена");
          return;
        }
        const primary = pickPrimaryRelease(releases);
        const suggested = suggestBuildOutputPath(data.mediaSaveDir, {
          movieTitle,
          movieYear,
          releaseType: state.outputReleaseType,
          version: state.outputVersion,
          resolutionLabel: primary?.videoTrack?.resolutionLabel,
          hdr: primary?.videoTrack?.hdr,
        });
        setState((current) => ({ ...current, outputPath: suggested }));
        resetValidation();
      })
      .catch(() => setError("Не удалось получить настройки"));
  }, [
    movieTitle,
    movieYear,
    releases,
    resetValidation,
    state.outputReleaseType,
    state.outputVersion,
  ]);

  const pathFilled = state.outputPath.trim().length > 0;
  const sizeEstimate = useMemo(
    () => estimateBuildOutputSizeFromRecipe(state.tracks, releases),
    [state.tracks, releases],
  );
  const warningsCount = validation?.warnings?.length ?? 0;
  const canSubmit =
    toolsOk &&
    pathFilled &&
    hasVideo &&
    validation?.ok === true &&
    (warningsCount === 0 || ackWarnings);

  const actionBarHint =
    validation?.ok === true
      ? "состав сборки проверен — можно ставить в очередь"
      : validation?.ok === false
        ? "есть ошибки — исправьте и проверьте снова"
        : "настройте состав сборки и нажмите «Проверить»";

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void handleSubmit();
      }}
      className="flex h-full min-h-0 flex-col gap-5 pb-28 lg:gap-6 lg:pb-0"
    >
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-5 overflow-y-auto lg:grid-cols-12 lg:gap-6 lg:overflow-hidden">
        {/* Sources */}
        <div className="lg:col-span-3 lg:overflow-y-auto lg:pr-1 scroll-subtle">
          <MachinedCard variant="calm" bodyClassName="space-y-4">
            <CardSectionHeader
              label="источники"
              title={movieTitle}
              labelTrailing={
                <InfoHint
                  label="Источники"
                  text="Клик по дорожке — добавить в сборку или убрать. Видео меняется только сменой релиза."
                />
              }
              trailing={
                <span className="font-mono-tech text-[10px] uppercase tracking-[0.14em] text-muted">
                  {releases.length} {pluralReleases(releases.length)}
                </span>
              }
            />
            <BuildSourceDecks
              releases={releases}
              inReel={inReel}
              activeVideoKey={activeVideoKey}
              onPick={handlePick}
            />
          </MachinedCard>
        </div>

        {/* Reel */}
        <div className="lg:col-span-6 lg:overflow-y-auto lg:pr-1 scroll-subtle">
          <div className="space-y-4">
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-sm)] border border-neural/35 bg-neural/[0.08] text-neural-bright">
                <Layers className="h-4 w-4" strokeWidth={1.5} aria-hidden />
              </span>
              <div>
                <p className="font-mono-tech text-[10px] uppercase tracking-[0.22em] text-muted">
                  сборка
                </p>
                <p className="font-display text-lg font-semibold tracking-tight text-text">
                  Дорожки результата
                </p>
              </div>
            </div>
            <BuildReel
              state={state}
              releases={releases}
              durationMismatchKeys={durationMismatchKeys}
              validation={validation}
              ackWarnings={ackWarnings}
              onAckChange={setAckWarnings}
              onTrackChange={handleTrackChange}
              onTrackRemove={handleTrackRemove}
              onReorder={handleReorder}
              onVideoReleaseChange={handleVideoReleaseChange}
            />
          </div>
        </div>

        {/* Output + health */}
        <div className="lg:col-span-3 lg:overflow-y-auto lg:pr-1 scroll-subtle">
          <MachinedCard variant="calm" bodyClassName="space-y-6">
            <CardSectionHeader label="назначение" title="Выходной файл" />
            <BuildOutputPanel
              outputPath={state.outputPath}
              outputReleaseType={state.outputReleaseType}
              outputVersion={state.outputVersion}
              sizeEstimate={sizeEstimate}
              storage={storage}
              onOutputPathChange={(value) => {
                setState((s) => ({ ...s, outputPath: value }));
                resetValidation();
              }}
              onReleaseTypeChange={(value) => {
                setState((s) => ({ ...s, outputReleaseType: value }));
                resetValidation();
              }}
              onVersionChange={(value) => {
                setState((s) => ({ ...s, outputVersion: value }));
                resetValidation();
              }}
              onSuggestPath={handleSuggestPath}
            />
            <div className="border-t border-border/60 pt-4">
              <BuildCapabilitiesPanel capabilities={capabilities} />
            </div>
          </MachinedCard>
        </div>
      </div>

      <FormActionBar idleMessage={actionBarHint} saving={loading} error={error}>
        <Button
          type="button"
          variant="secondary"
          loading={loading}
          onClick={() => void handleValidate()}
        >
          <Wand2 className="h-4 w-4" strokeWidth={1.5} aria-hidden />
          Проверить
        </Button>
        <Button
          type="submit"
          variant="primary"
          disabled={!canSubmit}
          loading={loading}
        >
          Поставить в очередь
        </Button>
      </FormActionBar>
    </form>
  );
}

function pluralReleases(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return "релиз";
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return "релиза";
  return "релизов";
}
