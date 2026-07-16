"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowLeft, Film, AudioLines, Captions } from "lucide-react";
import type { ReleaseWithTracks } from "@/lib/movies/movie-include";
import {
  moveTrackWithinKind,
  type BuildRecipeFormState,
  type BuildRecipeTrackState,
} from "@/lib/builds/build-recipe-state";
import { BuildReelTrackCard } from "@/components/builds/BuildReelTrackCard";
import { BuildVideoCard } from "@/components/builds/BuildVideoCard";
import { BuildKindSection } from "@/components/builds/BuildKindSection";
import { BuildValidationPanel } from "@/components/builds/BuildValidationPanel";
import { sourceTierTone } from "@/lib/builds/build-display";
import { releaseTabLabel } from "@/lib/media/spec-tags";

interface ValidationResult {
  ok: boolean;
  warnings: { code: string; message: string; severity: string }[];
  errors?: { code: string; message: string; severity: string }[];
  error?: string;
}

interface BuildReelProps {
  state: BuildRecipeFormState;
  releases: ReleaseWithTracks[];
  /** Audio track keys (releaseId:audio:streamIndex) flagged for duration mismatch. */
  durationMismatchKeys: Set<string>;
  validation: ValidationResult | null;
  ackWarnings: boolean;
  onAckChange: (v: boolean) => void;
  onTrackChange: (index: number, patch: Partial<BuildRecipeTrackState>) => void;
  onTrackRemove: (index: number) => void;
  onReorder: (tracks: BuildRecipeTrackState[]) => void;
  /** Сменить релиз-источник видео (подставит единственную видео-дорожку). */
  onVideoReleaseChange: (releaseId: number) => void;
}

export function BuildReel({
  state,
  releases,
  durationMismatchKeys,
  validation,
  ackWarnings,
  onAckChange,
  onTrackChange,
  onTrackRemove,
  onReorder,
  onVideoReleaseChange,
}: BuildReelProps) {
  const reduce = useReducedMotion();
  const tracks = state.tracks;

  const videoTrack = tracks.find((t) => t.kind === "video") ?? null;
  const audioTracks = tracks.filter((t) => t.kind === "audio");
  const subTracks = tracks.filter((t) => t.kind === "subtitle");

  const videoRelease = videoTrack
    ? releases.find((r) => r.id === videoTrack.sourceReleaseId) ?? null
    : null;
  const videoTone = videoRelease ? sourceTierTone(videoRelease) : "none";

  return (
    <div className="flex min-h-0 flex-col gap-4">
      {/* Видео */}
      <BuildKindSection
        icon={Film}
        label="видео"
        tone={videoTone}
        empty={!videoTrack}
        brief={
          videoRelease
            ? `${releaseTabLabel(videoRelease)}${videoRelease.videoTrack?.resolutionLabel && videoRelease.videoTrack.resolutionLabel !== "other" ? ` · ${videoRelease.videoTrack.resolutionLabel === "4K" ? "4K" : videoRelease.videoTrack.resolutionLabel}` : ""}`
            : "не выбрано"
        }
      >
        <BuildVideoCard
          track={videoTrack}
          releases={releases}
          onReleaseChange={onVideoReleaseChange}
        />
      </BuildKindSection>

      {/* Аудио */}
      <BuildKindSection
        icon={AudioLines}
        label="аудио"
        tone="none"
        empty={audioTracks.length === 0}
        brief={
          audioTracks.length === 0
            ? "нет"
            : `${audioTracks.length} ${pluralAudio(audioTracks.length)}${
              audioTracks.some((t) => t.isDefault)
                ? " · есть по умолчанию"
                : ""
            }`
        }
      >
        {audioTracks.length === 0 ? (
          <EmptyGroupHint text="Добавьте аудиодорожки из источников слева." />
        ) : (
          <div className="flex flex-col gap-3">
            <AnimatePresence initial={false} mode="popLayout">
              {audioTracks.map((track) => {
                const flatIndex = tracks.indexOf(track);
                const firstAudio = tracks.findIndex((t) => t.kind === "audio");
                const posInGroup = flatIndex - firstAudio;
                return (
                  <motion.div
                    key={track.key}
                    layout={reduce ? false : true}
                    initial={reduce ? false : { opacity: 0, y: 12, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.96, transition: { duration: 0.18 } }}
                    transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
                  >
                    <BuildReelTrackCard
                      track={track}
                      releases={releases}
                      hasDurationMismatch={durationMismatchKeys.has(
                        `${track.sourceReleaseId}:audio:${track.sourceStreamIndex}`,
                      )}
                      canMoveUp={posInGroup > 0}
                      canMoveDown={posInGroup < audioTracks.length - 1}
                      onChange={(patch) => onTrackChange(flatIndex, patch)}
                      onRemove={() => onTrackRemove(flatIndex)}
                      onMoveUp={() =>
                        onReorder(moveTrackWithinKind(tracks, flatIndex, -1))
                      }
                      onMoveDown={() =>
                        onReorder(moveTrackWithinKind(tracks, flatIndex, 1))
                      }
                    />
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </BuildKindSection>

      {/* Субтитры */}
      <BuildKindSection
        icon={Captions}
        label="субтитры"
        tone="none"
        empty={subTracks.length === 0}
        defaultOpen={false}
        brief={
          subTracks.length === 0
            ? "нет"
            : `${subTracks.length} ${pluralSubs(subTracks.length)}`
        }
      >
        {subTracks.length === 0 ? (
          <EmptyGroupHint text="Добавьте субтитры из источников слева." />
        ) : (
          <div className="flex flex-col gap-3">
            <AnimatePresence initial={false} mode="popLayout">
              {subTracks.map((track) => {
                const flatIndex = tracks.indexOf(track);
                const firstSub = tracks.findIndex((t) => t.kind === "subtitle");
                const posInGroup = flatIndex - firstSub;
                return (
                  <motion.div
                    key={track.key}
                    layout={reduce ? false : true}
                    initial={reduce ? false : { opacity: 0, y: 12, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.96, transition: { duration: 0.18 } }}
                    transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
                  >
                    <BuildReelTrackCard
                      track={track}
                      releases={releases}
                      hasDurationMismatch={false}
                      canMoveUp={posInGroup > 0}
                      canMoveDown={posInGroup < subTracks.length - 1}
                      onChange={(patch) => onTrackChange(flatIndex, patch)}
                      onRemove={() => onTrackRemove(flatIndex)}
                      onMoveUp={() =>
                        onReorder(moveTrackWithinKind(tracks, flatIndex, -1))
                      }
                      onMoveDown={() =>
                        onReorder(moveTrackWithinKind(tracks, flatIndex, 1))
                      }
                    />
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </BuildKindSection>

      {validation ? (
        <BuildValidationPanel
          validation={validation}
          ackWarnings={ackWarnings}
          onAckChange={onAckChange}
        />
      ) : null}
    </div>
  );
}

function EmptyGroupHint({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-2.5 rounded-[var(--radius-sm)] border border-dashed border-border-strong bg-bg-deep/30 px-3 py-3">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-border text-muted">
        <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden />
      </span>
      <p className="font-mono-tech text-[11px] leading-relaxed text-muted">{text}</p>
    </div>
  );
}

function pluralAudio(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return "дорожка";
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return "дорожки";
  return "дорожек";
}

function pluralSubs(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return "субтитр";
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return "субтитра";
  return "субтитров";
}
