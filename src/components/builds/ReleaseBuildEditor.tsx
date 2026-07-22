"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Layers } from "lucide-react";
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
import { BuildValidationPanel } from "@/components/builds/BuildValidationPanel";
import { BuildMappingPreviewPanel } from "@/components/builds/BuildMappingPreviewPanel";
import { estimateBuildOutputSizeFromRecipe } from "@/lib/builds/build-output-size";
import { suggestBuildOutputPath } from "@/lib/builds/build-filename";
import { buildRecipeTrackFromCatalogPick } from "@/lib/builds/build-track-source";
import type { BuildTrackMappingPreviewRow } from "@/lib/builds/build-mapping-preview";
import { pickPrimaryRelease } from "@/lib/releases/release-primary";
import { computeAudioDurationMismatchMap } from "@/lib/builds/build-duration-hint";

function buildSuggestInput(
  releases: ReleaseWithTracks[],
  state: BuildRecipeFormState,
  movieTitle: string,
  movieYear: number | null,
) {
  const videoReleaseId = state.tracks.find((t) => t.kind === "video")
    ?.sourceReleaseId;
  const videoRelease =
    releases.find((r) => r.id === videoReleaseId) ?? pickPrimaryRelease(releases);
  return {
    tracks: state.tracks,
    releases,
    movieTitle,
    movieYear,
    releaseType: state.outputReleaseType,
    version: state.outputVersion,
    resolutionLabel: videoRelease?.videoTrack?.resolutionLabel,
    hdr: videoRelease?.videoTrack?.hdr,
  };
}

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
  mappingPreview?: BuildTrackMappingPreviewRow[];
}

function warningsFingerprint(
  warnings: ValidationResult["warnings"] | undefined,
): string {
  return (warnings ?? [])
    .map((w) => `${w.code}\0${w.message}`)
    .sort()
    .join("\n");
}

function buildTrackFromSource(
  releases: ReleaseWithTracks[],
  releaseId: number,
  kind: BuildRecipeTrackState["kind"],
  streamIndex: number,
): BuildRecipeTrackState | null {
  const release = releases.find((r) => r.id === releaseId);
  if (!release) return null;
  return buildRecipeTrackFromCatalogPick(release, kind, streamIndex);
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
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [capabilities, setCapabilities] = useState<BuildCapabilities | null>(null);
  const validateSeq = useRef(0);
  const warningsFpRef = useRef("");
  const lastValidatedRecipeRef = useRef<string | null>(null);

  const storage = useStoragePicker(
    releases.find((r) => r.id === state.externalStorageId)?.externalStorage ?? null,
  );
  const resolveExternalStorageId = storage.resolveExternalStorageId;

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

  const autoOutputPath = useMemo(
    () =>
      suggestBuildOutputPath(
        buildSuggestInput(releases, state, movieTitle, movieYear),
      ),
    [
      releases,
      state.tracks,
      state.outputReleaseType,
      state.outputVersion,
      movieTitle,
      movieYear,
    ],
  );

  useEffect(() => {
    if (!autoOutputPath) return;
    setState((current) => {
      if (current.outputPath === autoOutputPath) return current;
      return { ...current, outputPath: autoOutputPath };
    });
  }, [autoOutputPath]);

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

  const durationMismatchByKey = useMemo(
    () => computeAudioDurationMismatchMap(state.tracks, releases),
    [state.tracks, releases],
  );

  const hasVideo = state.tracks.some((t) => t.kind === "video");
  const pathFilled = state.outputPath.trim().length > 0;

  const validationPrerequisiteHint = useMemo(() => {
    if (!hasVideo) return "Добавьте видео в состав сборки — проверка запустится автоматически.";
    if (!pathFilled) return "Укажите путь выходного файла — проверка запустится автоматически.";
    return null;
  }, [hasVideo, pathFilled]);

  const runValidate = useCallback(async () => {
    if (!hasVideo || !pathFilled) {
      setValidation(null);
      lastValidatedRecipeRef.current = null;
      return;
    }

    const seq = ++validateSeq.current;

    try {
      const externalStorageId = await resolveExternalStorageId();
      const payload = serializeBuildRecipe({ ...state, externalStorageId });
      const recipeKey = JSON.stringify(payload);
      if (recipeKey === lastValidatedRecipeRef.current) return;

      setError(null);

      const res = await fetch(`/api/movies/${movieId}/builds/validate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json().catch(() => null)) as ValidationResult | null;
      if (seq !== validateSeq.current) return;

      if (!data) {
        setError("Не удалось прочитать ответ проверки");
        setValidation(null);
        lastValidatedRecipeRef.current = null;
        return;
      }

      lastValidatedRecipeRef.current = recipeKey;
      setValidation(data);
      const nextFp = warningsFingerprint(data.warnings);
      setAckWarnings((acked) => {
        if (warningsFpRef.current === nextFp) return acked;
        warningsFpRef.current = nextFp;
        return false;
      });
      if (!data.ok && data.error) setError(data.error);
    } catch (err) {
      if (seq !== validateSeq.current) return;
      setError(err instanceof Error ? err.message : "Ошибка проверки");
      setValidation(null);
      lastValidatedRecipeRef.current = null;
    }
  }, [hasVideo, pathFilled, movieId, state, resolveExternalStorageId]);

  useEffect(() => {
    if (validationPrerequisiteHint) {
      setValidation(null);
      warningsFpRef.current = "";
      lastValidatedRecipeRef.current = null;
      setAckWarnings(false);
      return;
    }

    const timer = setTimeout(() => {
      void runValidate();
    }, 450);

    return () => {
      clearTimeout(timer);
    };
  }, [validationPrerequisiteHint, runValidate]);

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
    },
    [releases],
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
    },
    [releases],
  );

  const handleTrackChange = useCallback(
    (index: number, patch: Partial<BuildRecipeTrackState>) => {
      setState((current) => ({
        ...current,
        tracks: applyTrackPatch(current.tracks, index, patch),
      }));
    },
    [],
  );

  const handleTrackRemove = useCallback((index: number) => {
    setState((current) => ({
      ...current,
      tracks: current.tracks.filter((_, i) => i !== index),
    }));
  }, []);

  const handleReorder = useCallback((tracks: BuildRecipeTrackState[]) => {
    setState((current) => ({ ...current, tracks }));
  }, []);

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const externalStorageId = await resolveExternalStorageId();
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
      setSubmitting(false);
    }
  };

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

  const actionBarHint = useMemo(() => {
    if (!toolsOk) return "не все утилиты доступны — см. панель справа";
    if (validationPrerequisiteHint) return validationPrerequisiteHint;
    if (validation?.ok === false) return "есть ошибки — см. блок «Готовность к очереди» справа";
    if (validation?.ok && warningsCount > 0 && !ackWarnings) {
      return "подтвердите предупреждения справа, чтобы поставить в очередь";
    }
    if (validation?.ok) return "состав проверен — можно поставить в очередь";
    return "настройте состав сборки";
  }, [
    toolsOk,
    validationPrerequisiteHint,
    validation?.ok,
    warningsCount,
    ackWarnings,
  ]);

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
              durationMismatchByKey={durationMismatchByKey}
              onTrackChange={handleTrackChange}
              onTrackRemove={handleTrackRemove}
              onReorder={handleReorder}
              onVideoReleaseChange={handleVideoReleaseChange}
            />
          </div>
        </div>

        {/* Output + health */}
        <div className="lg:col-span-3 lg:overflow-y-auto lg:pr-1 scroll-subtle">
          <div className="space-y-4 lg:sticky lg:top-0">
            <BuildValidationPanel
              validation={validation}
              prerequisiteHint={validationPrerequisiteHint}
              ackWarnings={ackWarnings}
              onAckChange={setAckWarnings}
            />
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
                }}
                onReleaseTypeChange={(value) => {
                  setState((s) => ({ ...s, outputReleaseType: value }));
                }}
                onVersionChange={(value) => {
                  setState((s) => ({ ...s, outputVersion: value }));
                }}
              />
              <div className="border-t border-border/60 pt-4">
                <BuildCapabilitiesPanel capabilities={capabilities} />
              </div>
            </MachinedCard>
            {validation?.ok && validation.mappingPreview?.length ? (
              <BuildMappingPreviewPanel rows={validation.mappingPreview} />
            ) : null}
          </div>
        </div>
      </div>

      <FormActionBar idleMessage={actionBarHint} saving={submitting} error={error}>
        <Button
          type="submit"
          variant="primary"
          disabled={!canSubmit}
          loading={submitting}
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
