"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  Plus,
  Trash2,
  Wand2,
} from "lucide-react";
import type { ReleaseWithTracks } from "@/lib/movies/movie-include";
import { Button } from "@/components/primitives/Button";
import { Field } from "@/components/primitives/Field";
import { Select } from "@/components/primitives/Select";
import { FormActionBar } from "@/components/primitives/FormActionBar";
import { MachinedCard, CardSectionHeader } from "@/components/primitives/MachinedCard";
import { StoragePicker } from "@/components/shared/StoragePicker";
import { useStoragePicker } from "@/hooks/useStoragePicker";
import {
  AC3_BITRATES,
  EAC3_BITRATES,
  channelTargetLabel,
} from "@/lib/builds/build-presets";
import {
  createInitialBuildState,
  moveTrack,
  serializeBuildRecipe,
  type BuildRecipeFormState,
  type BuildRecipeTrackState,
} from "@/lib/builds/build-recipe-state";
import {
  DEFAULT_MOVIE_VERSION,
  MOVIE_VERSIONS,
  RELEASE_TYPES,
} from "@/lib/shared/dictionaries";
import { releaseTabLabel } from "@/lib/media/spec-tags";
import { apiFetch } from "@/lib/api/client";
import { BuildWarningsPanel } from "@/components/builds/BuildWarningsPanel";

interface ReleaseBuildEditorProps {
  movieId: number;
  movieSlug: string;
  movieTitle: string;
  releases: ReleaseWithTracks[];
}

interface ValidationResult {
  ok: boolean;
  warnings: { code: string; message: string; severity: string }[];
  errors?: { code: string; message: string; severity: string }[];
  error?: string;
}

function trackOptionsForRelease(release: ReleaseWithTracks) {
  const options: {
    kind: BuildRecipeTrackState["kind"];
    streamIndex: number;
    label: string;
  }[] = [];
  if (release.videoTrack) {
    options.push({
      kind: "video",
      streamIndex: release.videoTrack.streamIndex,
      label: `Видео ${release.videoTrack.resolutionLabel ?? ""}`.trim(),
    });
  }
  for (const audio of release.audioTracks) {
    options.push({
      kind: "audio",
      streamIndex: audio.streamIndex,
      label:
        audio.title ||
        `${audio.language ?? "?"} ${audio.codec ?? ""} ${audio.channelLayout ?? ""}`.trim(),
    });
  }
  for (const sub of release.subtitleTracks) {
    options.push({
      kind: "subtitle",
      streamIndex: sub.streamIndex,
      label: sub.title || `${sub.language ?? "?"} ${sub.codecLabel ?? ""}`.trim(),
    });
  }
  return options;
}

export function ReleaseBuildEditor({
  movieId,
  movieSlug,
  movieTitle,
  releases,
}: ReleaseBuildEditorProps) {
  const router = useRouter();
  const [state, setState] = useState(() => createInitialBuildState(releases));
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [ackWarnings, setAckWarnings] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const storage = useStoragePicker(
    releases.find((r) => r.externalStorageId === state.externalStorageId)
      ?.externalStorage ?? null,
  );

  const releaseOptions = useMemo(
    () =>
      releases.map((release) => ({
        id: release.id,
        label: releaseTabLabel(release),
        options: trackOptionsForRelease(release),
      })),
    [releases],
  );

  const updateTrack = (index: number, patch: Partial<BuildRecipeTrackState>) => {
    setState((current) => ({
      ...current,
      tracks: current.tracks.map((track, i) =>
        i === index ? { ...track, ...patch } : track,
      ),
    }));
    setValidation(null);
    setAckWarnings(false);
  };

  const removeTrack = (index: number) => {
    setState((current) => ({
      ...current,
      tracks: current.tracks.filter((_, i) => i !== index),
    }));
  };

  const addTrackFromRelease = (releaseId: number, kind: "audio" | "subtitle") => {
    const release = releases.find((r) => r.id === releaseId);
    if (!release) return;
    const options = trackOptionsForRelease(release).filter((o) => o.kind === kind);
    const first = options[0];
    if (!first) return;
    setState((current) => ({
      ...current,
      tracks: [
        ...current.tracks,
        {
          key: crypto.randomUUID(),
          kind,
          sourceReleaseId: releaseId,
          sourceStreamIndex: first.streamIndex,
          label: first.label,
          audioMode: kind === "audio" ? "copy" : undefined,
          offsetMs: 0,
          transcodeCodec: "eac3",
          transcodeBitrate: 768,
          channelTarget: "up_to_51",
        },
      ],
    }));
  };

  const handleValidate = async () => {
    setLoading(true);
    setError(null);
    try {
      const payload = serializeBuildRecipe(state);
      const result = await apiFetch<ValidationResult>(
        `/api/movies/${movieId}/builds/validate`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
        "Ошибка проверки",
      );
      setValidation(result);
      setAckWarnings(false);
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
      const payload = {
        ...serializeBuildRecipe(state),
        acknowledgeWarnings:
          (validation?.warnings?.length ?? 0) > 0 ? ackWarnings : undefined,
      };
      const created = await apiFetch<{ id: number }>(
        `/api/movies/${movieId}/builds`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
        "Не удалось поставить сборку в очередь",
      );
      router.push(`/builds/${created.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setLoading(false);
    }
  };

  const canSubmit =
    state.outputPath.trim().length > 0 &&
    state.tracks.some((t) => t.kind === "video") &&
    validation?.ok === true &&
    ((validation.warnings?.length ?? 0) === 0 || ackWarnings);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void handleSubmit();
      }}
      className="flex h-full min-h-0 flex-col gap-6 pb-28 lg:pb-0"
    >
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-6 lg:grid-cols-3 lg:gap-8">
        <div className="flex flex-col gap-6 lg:col-span-1">
          <MachinedCard variant="calm" bodyClassName="space-y-5">
            <CardSectionHeader label="результат" title="Выходной файл" />
            <StoragePicker
              compact
              storageKind={storage.storageKind}
              onStorageKindChange={storage.setStorageKind}
              externalStorages={storage.externalStorages}
              selectedStorageId={storage.selectedStorageId}
              onSelectedStorageIdChange={storage.setSelectedStorageId}
              onCreateExternalStorage={storage.createExternalStorage}
            />
            <Field label="Путь к MKV" hint="Абсолютный путь к новому файлу.">
              <input
                className="focus-ring min-h-11 w-full rounded-[var(--radius)] border border-border bg-bg-elevated px-3 py-2 text-sm text-text"
                value={state.outputPath}
                onChange={(e) =>
                  setState((s) => ({ ...s, outputPath: e.target.value }))
                }
                placeholder="/mnt/d/Movies/custom.mkv"
              />
            </Field>
            <Select
              label="Тип релиза"
              value={state.outputReleaseType}
              onChange={(v) => setState((s) => ({ ...s, outputReleaseType: v }))}
              options={[{ value: "", label: "—" }, ...RELEASE_TYPES]}
            />
            <Select
              label="Версия"
              value={state.outputVersion}
              onChange={(v) => setState((s) => ({ ...s, outputVersion: v }))}
              options={MOVIE_VERSIONS}
            />
          </MachinedCard>

          <MachinedCard variant="calm" bodyClassName="space-y-3">
            <CardSectionHeader label="источники" title={movieTitle} />
            {releaseOptions.map((release) => (
              <div
                key={release.id}
                className="rounded-[var(--radius-sm)] border border-border bg-bg-elevated/60 p-3"
              >
                <p className="font-mono-tech text-[11px] text-muted">{release.label}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => addTrackFromRelease(release.id, "audio")}
                  >
                    <Plus className="h-3.5 w-3.5" aria-hidden />
                    Аудио
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => addTrackFromRelease(release.id, "subtitle")}
                  >
                    <Plus className="h-3.5 w-3.5" aria-hidden />
                    Субтитры
                  </Button>
                </div>
              </div>
            ))}
          </MachinedCard>
        </div>

        <div className="flex min-h-0 flex-col gap-4 lg:col-span-2 lg:overflow-y-auto lg:pr-1 scroll-subtle">
          <MachinedCard variant="calm" bodyClassName="space-y-4">
            <CardSectionHeader label="состав" title="Дорожки результата" />
            {state.tracks.map((track, index) => (
              <div
                key={track.key}
                className="rounded-[var(--radius)] border border-border-strong bg-bg-elevated/70 p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-mono-tech text-[11px] uppercase text-faint">
                      {track.kind}
                    </p>
                    <p className="text-sm text-text">{track.label}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      className="focus-ring rounded p-1 text-muted hover:text-accent"
                      onClick={() =>
                        setState((s) => ({
                          ...s,
                          tracks: moveTrack(s.tracks, index, index - 1),
                        }))
                      }
                      disabled={index === 0}
                      aria-label="Выше"
                    >
                      <ArrowUp className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      className="focus-ring rounded p-1 text-muted hover:text-accent"
                      onClick={() =>
                        setState((s) => ({
                          ...s,
                          tracks: moveTrack(s.tracks, index, index + 1),
                        }))
                      }
                      disabled={index === state.tracks.length - 1}
                      aria-label="Ниже"
                    >
                      <ArrowDown className="h-4 w-4" />
                    </button>
                    {track.kind !== "video" ? (
                      <button
                        type="button"
                        className="focus-ring rounded p-1 text-muted hover:text-danger"
                        onClick={() => removeTrack(index)}
                        aria-label="Удалить"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    ) : null}
                  </div>
                </div>

                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <Select
                    label="Источник"
                    value={String(track.sourceReleaseId)}
                    onChange={(v) => updateTrack(index, { sourceReleaseId: Number(v) })}
                    options={releases.map((r) => ({
                      value: String(r.id),
                      label: releaseTabLabel(r),
                    }))}
                  />
                  <Select
                    label="Дорожка"
                    value={String(track.sourceStreamIndex)}
                    onChange={(v) => {
                      const release = releases.find((r) => r.id === track.sourceReleaseId);
                      if (!release) return;
                      const option = trackOptionsForRelease(release).find(
                        (o) =>
                          o.kind === track.kind &&
                          o.streamIndex === Number(v),
                      );
                      updateTrack(index, {
                        sourceStreamIndex: Number(v),
                        label: option?.label ?? track.label,
                      });
                    }}
                    options={trackOptionsForRelease(
                      releases.find((r) => r.id === track.sourceReleaseId) ?? releases[0]!,
                    )
                      .filter((o) => o.kind === track.kind)
                      .map((o) => ({
                        value: String(o.streamIndex),
                        label: o.label,
                      }))}
                  />
                </div>

                {track.kind === "audio" ? (
                  <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    <Select
                      label="Режим"
                      value={track.audioMode ?? "copy"}
                      onChange={(v) =>
                        updateTrack(index, {
                          audioMode: v as "copy" | "transcode",
                        })
                      }
                      options={[
                        { value: "copy", label: "Копировать" },
                        { value: "transcode", label: "Перекодировать" },
                      ]}
                    />
                    {track.audioMode === "transcode" ? (
                      <>
                        <Select
                          label="Кодек"
                          value={track.transcodeCodec ?? "eac3"}
                          onChange={(v) =>
                            updateTrack(index, {
                              transcodeCodec: v as "ac3" | "eac3",
                              transcodeBitrate: undefined,
                            })
                          }
                          options={[
                            { value: "ac3", label: "AC-3" },
                            { value: "eac3", label: "E-AC3" },
                          ]}
                        />
                        <Select
                          label="Битрейт"
                          value={String(track.transcodeBitrate ?? 768)}
                          onChange={(v) =>
                            updateTrack(index, { transcodeBitrate: Number(v) })
                          }
                          options={(track.transcodeCodec === "ac3"
                            ? AC3_BITRATES
                            : EAC3_BITRATES
                          ).map((b) => ({ value: String(b), label: `${b} kbps` }))}
                        />
                        <Select
                          label="Каналы"
                          value={track.channelTarget ?? "up_to_51"}
                          onChange={(v) =>
                            updateTrack(index, {
                              channelTarget: v as "stereo" | "up_to_51",
                            })
                          }
                          options={[
                            { value: "stereo", label: channelTargetLabel("stereo") },
                            {
                              value: "up_to_51",
                              label: channelTargetLabel("up_to_51"),
                            },
                          ]}
                        />
                      </>
                    ) : (
                      <Field label="Сдвиг, мс" hint="Ручная подстройка синхронизации.">
                        <input
                          type="number"
                          className="focus-ring min-h-11 w-full rounded-[var(--radius)] border border-border bg-bg-elevated px-3 py-2 text-sm"
                          value={track.offsetMs ?? 0}
                          onChange={(e) =>
                            updateTrack(index, { offsetMs: Number(e.target.value) })
                          }
                        />
                      </Field>
                    )}
                    <label className="flex items-center gap-2 text-sm text-muted">
                      <input
                        type="checkbox"
                        checked={track.isDefault ?? false}
                        onChange={(e) =>
                          updateTrack(index, { isDefault: e.target.checked })
                        }
                      />
                      Дорожка по умолчанию
                    </label>
                  </div>
                ) : null}
              </div>
            ))}
          </MachinedCard>

          {validation ? (
            <BuildWarningsPanel
              validation={validation}
              ackWarnings={ackWarnings}
              onAckChange={setAckWarnings}
            />
          ) : null}
        </div>
      </div>

      <FormActionBar isDirty saving={loading} error={error}>
        <Link
          href={`/movies/${movieSlug}`}
          className="focus-ring inline-flex min-h-11 items-center justify-center rounded-[var(--radius)] border border-border-strong bg-bg-surface px-4 py-2 text-sm font-medium text-text"
        >
          Отмена
        </Link>
        <Button
          type="button"
          variant="secondary"
          loading={loading}
          onClick={() => void handleValidate()}
        >
          <Wand2 className="h-4 w-4" aria-hidden />
          Проверить
        </Button>
        <Button type="submit" variant="primary" disabled={!canSubmit} loading={loading}>
          Поставить в очередь
        </Button>
      </FormActionBar>
    </form>
  );
}
