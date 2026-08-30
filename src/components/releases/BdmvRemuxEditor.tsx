"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Disc3 } from "lucide-react";
import { Button } from "@/components/primitives/Button";
import { Field } from "@/components/primitives/Field";
import { Select } from "@/components/primitives/Select";
import { FormActionBar } from "@/components/primitives/FormActionBar";
import {
  MachinedCard,
  CardSectionHeader,
} from "@/components/primitives/MachinedCard";
import { ConfirmDialog } from "@/components/primitives/ConfirmDialog";
import { FolderPathField } from "@/components/shared/FolderPathField";
import { StoragePicker } from "@/components/shared/StoragePicker";
import { BuildReel } from "@/components/builds/BuildReel";
import { BdmvPlaylistList, type BdmvPlaylistRow } from "@/components/releases/BdmvPlaylistList";
import { useStoragePicker } from "@/hooks/useStoragePicker";
import { apiFetch } from "@/lib/api/client";
import type { BuildCapabilities } from "@/lib/builds/build-capabilities";
import {
  applyTrackPatch,
  normalizeExclusiveDefaults,
  type BuildRecipeFormState,
  type BuildRecipeTrackState,
} from "@/lib/builds/build-recipe-state";
import { suggestBdmvOutputPath } from "@/lib/builds/bdmv-output-path";
import { bdmvInspectTrackLabel } from "@/lib/media/bdmv/bdmv-track-label";
import { formatBytes } from "@/lib/shared/format-bytes";
import { formatDuration } from "@/lib/shared/duration-format";
import { displayFilePath, commitFilePathInput } from "@/lib/shared/display-path";
import { pluralRu } from "@/lib/shared/russian-plural";

interface InspectTrack {
  id: number;
  type: "video" | "audio" | "subtitle";
  codec: string | null;
  language: string | null;
  name: string | null;
  defaultTrack: boolean;
  forcedTrack: boolean;
  channels: number | null;
}

interface InspectResult {
  bdmvRoot: string;
  playlists: BdmvPlaylistRow[];
  selected: {
    path: string;
    durationSeconds: number | null;
    tracks: {
      video: InspectTrack[];
      audio: InspectTrack[];
      subtitles: InspectTrack[];
    };
  } | null;
  warnings: { code: string; message: string }[];
}

function seedTracks(selected: NonNullable<InspectResult["selected"]>): BuildRecipeTrackState[] {
  const tracks: BuildRecipeTrackState[] = [];
  const push = (
    kind: BuildRecipeTrackState["kind"],
    track: InspectTrack,
    fallback: string,
  ) => {
    const label =
      bdmvInspectTrackLabel(track) || track.name || track.language || track.codec || fallback;
    tracks.push({
      key: crypto.randomUUID(),
      kind,
      sourceReleaseId: 0,
      sourceStreamIndex: track.id,
      label,
      sourceLabel: label,
      audioMode: kind === "audio" ? "copy" : undefined,
      isDefault: track.defaultTrack,
      forced: track.forcedTrack,
    });
  };
  for (const track of selected.tracks.video) push("video", track, "Видео");
  for (const track of selected.tracks.audio) push("audio", track, `Audio ${track.id}`);
  for (const track of selected.tracks.subtitles) {
    push("subtitle", track, `Sub ${track.id}`);
  }
  return normalizeExclusiveDefaults(tracks);
}

function tracksFingerprint(tracks: BuildRecipeTrackState[]): string {
  return JSON.stringify(
    tracks.map((t) => ({
      kind: t.kind,
      id: t.sourceStreamIndex,
      label: t.label,
      isDefault: t.isDefault,
      forced: t.forced,
    })),
  );
}

export function BdmvRemuxEditor({
  movieId,
  movieTitle,
  movieYear,
  parts,
}: {
  movieId: number;
  movieTitle: string;
  movieYear: number | null;
  parts: { id: number; partNumber: number; title: string | null }[];
}) {
  const router = useRouter();
  const storage = useStoragePicker();
  const [bdmvPath, setBdmvPath] = useState("");
  const [inspecting, setInspecting] = useState(false);
  const [inspectError, setInspectError] = useState<string | null>(null);
  const [result, setResult] = useState<InspectResult | null>(null);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [tracks, setTracks] = useState<BuildRecipeTrackState[]>([]);
  const [seedFingerprint, setSeedFingerprint] = useState("");
  const [outputPath, setOutputPath] = useState("");
  const [currentSuggestedRoot, setCurrentSuggestedRoot] = useState("");
  const [moviePartId, setMoviePartId] = useState<string>("");
  const [acknowledgeWarnings, setAcknowledgeWarnings] = useState(false);
  const [pendingPlaylist, setPendingPlaylist] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [caps, setCaps] = useState<BuildCapabilities | null>(null);

  useEffect(() => {
    void apiFetch<BuildCapabilities>("/api/builds/capabilities").then(setCaps);
  }, []);

  const selectedPlaylist = result?.playlists.find((p) => p.path === selectedPath) ?? null;
  const hasVideo = tracks.some((t) => t.kind === "video");
  const dirty = tracksFingerprint(tracks) !== seedFingerprint && seedFingerprint !== "";
  const ackCodes = new Set(["multiple-bdmv", "short-playlists"]);
  const needsAck = (result?.warnings ?? []).some((w) => ackCodes.has(w.code));
  const mkvmergeMissing = caps != null && !caps.mkvmerge.available;
  const selectedMissingClips = (selectedPlaylist?.missingClips.length ?? 0) > 0;

  const applyInspect = (data: InspectResult) => {
    setResult(data);
    const nextPath = data.selected?.path ?? data.playlists.find((p) => p.likelyMain)?.path ?? data.playlists[0]?.path ?? null;
    setSelectedPath(nextPath);
    const seeded = data.selected ? seedTracks(data.selected) : [];
    setTracks(seeded);
    setSeedFingerprint(tracksFingerprint(seeded));
    setOutputPath((current) => {
      if (current.trim() && currentSuggestedRoot === data.bdmvRoot) {
        return current;
      }
      return suggestBdmvOutputPath({
        movieTitle,
        movieYear,
        bdmvRoot: data.bdmvRoot,
      });
    });
    setCurrentSuggestedRoot(data.bdmvRoot);
    setAcknowledgeWarnings(false);
  };

  const runInspect = async (playlistPath?: string) => {
    if (!bdmvPath.trim()) return;
    setInspecting(true);
    setInspectError(null);
    setSubmitError(null);
    try {
      const data = await apiFetch<InspectResult>(
        `/api/movies/${movieId}/bdmv/inspect`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            bdmvPath,
            ...(playlistPath ? { playlistPath } : {}),
          }),
        },
        "Не удалось прочитать диск",
      );
      applyInspect(data);
    } catch (err) {
      setInspectError(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setInspecting(false);
    }
  };

  const requestPlaylistChange = (path: string) => {
    if (path === selectedPath) return;
    if (dirty) {
      setPendingPlaylist(path);
      return;
    }
    void runInspect(path);
  };

  const confirmPlaylistChange = () => {
    const path = pendingPlaylist;
    setPendingPlaylist(null);
    if (path) void runInspect(path);
  };

  const reelState: BuildRecipeFormState = {
    tracks,
    outputPath,
    outputReleaseType: "bdremux",
    outputVersion: "theatrical",
    externalStorageId: null,
  };

  const canSubmit =
    hasVideo &&
    Boolean(outputPath.trim()) &&
    Boolean(selectedPath) &&
    !inspecting &&
    !submitting &&
    !mkvmergeMissing &&
    !selectedMissingClips &&
    (!needsAck || acknowledgeWarnings);

  const handleSubmit = async () => {
    if (!canSubmit || !selectedPath || !result) return;
    const storageError = storage.validateStorage();
    if (storageError) {
      setSubmitError(storageError);
      return;
    }
    setSubmitting(true);
    setSubmitError(null);
    try {
      const externalStorageId = await storage.resolveExternalStorageId();
      const build = await apiFetch<{ id: number }>(
        `/api/movies/${movieId}/bdmv/builds`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            bdmvRoot: result.bdmvRoot,
            playlistPath: selectedPath,
            outputPath,
            outputReleaseType: "bdremux",
            externalStorageId,
            moviePartId: moviePartId ? Number(moviePartId) : null,
            acknowledgeWarnings: needsAck ? acknowledgeWarnings : undefined,
            tracks: tracks.map((track) => ({
              kind: track.kind,
              sourceStreamIndex: track.sourceStreamIndex,
              label: track.label,
              isDefault: track.isDefault,
              forced: track.forced,
            })),
          }),
        },
        "Не удалось поставить сборку в очередь",
      );
      router.push(`/builds/${build.id}`);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setSubmitting(false);
    }
  };

  const sourceCaption = selectedPlaylist?.fileName ?? "BDMV";

  return (
    <form
      className="flex h-full min-h-0 flex-col pb-28 lg:pb-0"
      onSubmit={(e) => {
        e.preventDefault();
        void handleSubmit();
      }}
    >
      <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto scroll-subtle lg:pr-1">
        <MachinedCard variant="calm" bodyClassName="space-y-4">
          <CardSectionHeader label="диск" title="Папка BDMV" />
          <FolderPathField
            label="Папка"
            value={bdmvPath}
            onChange={(runtime) => setBdmvPath(runtime)}
            hint="Укажите папку фильма, каталог BDMV или PLAYLIST."
          />
          {inspectError ? (
            <p className="text-sm text-danger" role="alert">
              {inspectError}
            </p>
          ) : null}
          {mkvmergeMissing ? (
            <p className="text-sm text-danger" role="alert">
              mkvmerge не найден в PATH
            </p>
          ) : null}
          <Button
            type="button"
            variant="secondary"
            className="min-h-11"
            loading={inspecting}
            disabled={!bdmvPath.trim() || inspecting}
            onClick={() => void runInspect()}
          >
            <Disc3 className="h-4 w-4" aria-hidden />
            Прочитать диск
          </Button>
        </MachinedCard>

        {result && selectedPlaylist ? (
          <MachinedCard variant="calm" bodyClassName="space-y-4">
            <CardSectionHeader label="плейлист" title="Основной фильм" />
            <p className="text-sm text-text">
              {formatDuration(selectedPlaylist.durationSeconds) ?? "без длительности"}
              {selectedPlaylist.estimatedBytes
                ? ` · ${formatBytes(selectedPlaylist.estimatedBytes, { unit: "short" })}`
                : ""}
              {` · ${selectedPlaylist.clipCount} ${pluralRu(selectedPlaylist.clipCount, "клип", "клипа", "клипов")}`}
            </p>
            <p className="text-sm text-muted">
              Основной фильм выбран по длительности. Короткий плейлист обычно содержит
              трейлеры.
            </p>
            {result.playlists.length > 1 ? (
              <details className="rounded-[var(--radius)] border border-border px-3 py-2">
                <summary className="cursor-pointer text-sm text-muted">
                  Другие плейлисты ({result.playlists.length})
                </summary>
                <div className="mt-3">
                  <BdmvPlaylistList
                    playlists={result.playlists}
                    selectedPath={selectedPath}
                    onSelect={requestPlaylistChange}
                  />
                </div>
              </details>
            ) : null}
            {result.warnings.length > 0 ? (
              <ul className="space-y-1" role="alert">
                {result.warnings.map((warning) => (
                  <li key={warning.code} className="text-sm text-ember-bright">
                    {warning.message}
                  </li>
                ))}
              </ul>
            ) : null}
          </MachinedCard>
        ) : null}

        {result ? (
          <MachinedCard variant="calm" bodyClassName="space-y-4">
            <CardSectionHeader label="дорожки" title="Состав" />
            <p className="text-sm text-muted">
              Состав копируется с диска. Перекодировать звук можно позже через сборку из
              полученного релиза.
            </p>
            {inspecting ? (
              <p className="text-sm text-muted">Читаю дорожки плейлиста…</p>
            ) : (
              <BuildReel
                state={reelState}
                releases={[]}
                durationMismatchByKey={new Map()}
                copyOnly
                sourceCaption={sourceCaption}
                onTrackChange={(index, patch) =>
                  setTracks((current) => applyTrackPatch(current, index, patch))
                }
                onTrackRemove={(index) =>
                  setTracks((current) =>
                    normalizeExclusiveDefaults(
                      current.filter((_, i) => i !== index),
                    ),
                  )
                }
                onReorder={setTracks}
                onVideoReleaseChange={() => undefined}
              />
            )}
          </MachinedCard>
        ) : null}

        {result ? (
          <MachinedCard variant="calm" bodyClassName="space-y-4">
            <CardSectionHeader label="вывод" title="Куда писать" />
            <Field
              label="Путь к MKV"
              value={displayFilePath(outputPath)}
              onChange={(e) => {
                const { runtime } = commitFilePathInput(e.target.value);
                setOutputPath(runtime);
              }}
            />
            {parts.length > 0 ? (
              <Select
                label="Серия"
                value={moviePartId}
                onChange={setMoviePartId}
                options={[
                  { value: "", label: "Не привязывать" },
                  ...parts.map((part) => ({
                    value: String(part.id),
                    label: part.title
                      ? `${part.partNumber}. ${part.title}`
                      : `Серия ${part.partNumber}`,
                  })),
                ]}
              />
            ) : null}
            <StoragePicker
              compact
              storageKind={storage.storageKind}
              onStorageKindChange={storage.setStorageKind}
              externalStorages={storage.externalStorages}
              selectedStorageId={storage.selectedStorageId}
              onSelectedStorageIdChange={storage.setSelectedStorageId}
              onCreateExternalStorage={async (name) => {
                await storage.createExternalStorage(name);
              }}
            />
            {needsAck ? (
              <label className="flex items-start gap-2 text-sm text-muted">
                <input
                  type="checkbox"
                  className="mt-1 accent-[var(--accent)]"
                  checked={acknowledgeWarnings}
                  onChange={(e) => setAcknowledgeWarnings(e.target.checked)}
                />
                Всё равно поставить в очередь
              </label>
            ) : null}
          </MachinedCard>
        ) : null}
      </div>

      <FormActionBar
        saving={submitting}
        error={submitError}
        idleMessage={
          !hasVideo && result
            ? "В составе должна быть видеодорожка"
            : "Состав копируется с диска без перекодирования"
        }
      >
        <Button
          type="submit"
          variant="primary"
          loading={submitting}
          disabled={!canSubmit}
        >
          Поставить в очередь
        </Button>
      </FormActionBar>

      <ConfirmDialog
        open={pendingPlaylist != null}
        onClose={() => setPendingPlaylist(null)}
        onConfirm={confirmPlaylistChange}
        title="Сменить плейлист?"
        description="Состав дорожек будет сброшен к данным нового плейлиста."
        confirmLabel="Сменить и сбросить состав"
        tone="accent"
      />
    </form>
  );
}
