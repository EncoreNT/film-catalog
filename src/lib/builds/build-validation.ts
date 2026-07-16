import path from "path";
import { prisma } from "@/lib/db/prisma";
import type { buildRecipeSchema } from "@/lib/api/validators/build";
import type { z } from "zod";
import {
  durationDeltaWarnings,
  fileIsReadable,
  inspectReleaseFile,
  resolveMkvTrackIdForStream,
  type BuildWarning,
  type InspectedReleaseFile,
} from "@/lib/builds/build-inspect-runtime";
import {
  isValidBitrate,
  type TranscodeCodec,
} from "@/lib/builds/build-presets";
import { normalizeOutputPath } from "@/lib/builds/build-inspection";

export type BuildRecipe = z.infer<typeof buildRecipeSchema>;

export interface ValidatedBuildRecipe {
  recipe: BuildRecipe;
  warnings: BuildWarning[];
  inspected: Map<number, InspectedReleaseFile>;
  videoSourceReleaseId: number;
  videoDurationSeconds: number | null;
}

function trackLabel(
  track: BuildRecipe["tracks"][number],
  inspected: InspectedReleaseFile,
): string {
  if (track.label?.trim()) return track.label.trim();
  if (track.kind === "video") return "видео";
  if (track.kind === "audio") {
    const audio = inspected.probe.audio.find(
      (a) => a.streamIndex === track.sourceStreamIndex,
    );
    return audio?.title || audio?.language || `audio #${track.sourceStreamIndex}`;
  }
  const sub = inspected.probe.subtitles.find(
    (s) => s.streamIndex === track.sourceStreamIndex,
  );
  return sub?.title || sub?.language || `sub #${track.sourceStreamIndex}`;
}

export async function validateBuildRecipe(
  movieId: number,
  recipe: BuildRecipe,
): Promise<ValidatedBuildRecipe> {
  const warnings: BuildWarning[] = [];
  const errors: BuildWarning[] = [];

  let outputPath: string;
  try {
    outputPath = normalizeOutputPath(recipe.outputPath);
  } catch (err) {
    errors.push({
      code: "invalid_output_path",
      message: err instanceof Error ? err.message : "Некорректный путь",
      severity: "error",
    });
    throw new ValidationFailed(errors, warnings);
  }

  const videoTracks = recipe.tracks.filter((t) => t.kind === "video");
  if (videoTracks.length !== 1) {
    errors.push({
      code: "video_count",
      message: "Нужна ровно одна видеодорожка",
      severity: "error",
    });
  }

  const movie = await prisma.movie.findUnique({
    where: { id: movieId },
    select: {
      id: true,
      releases: {
        select: {
          id: true,
          filePath: true,
          movieId: true,
        },
      },
    },
  });

  if (!movie) {
    errors.push({
      code: "movie_not_found",
      message: "Фильм не найден",
      severity: "error",
    });
    throw new ValidationFailed(errors, warnings);
  }

  const releaseMap = new Map(movie.releases.map((r) => [r.id, r]));
  const inspected = new Map<number, InspectedReleaseFile>();

  for (const track of recipe.tracks) {
    const release = releaseMap.get(track.sourceReleaseId);
    if (!release) {
      errors.push({
        code: "release_not_in_movie",
        message: `Релиз ${track.sourceReleaseId} не принадлежит фильму`,
        severity: "error",
      });
      continue;
    }
    if (!release.filePath?.trim()) {
      errors.push({
        code: "missing_file_path",
        message: `У релиза ${track.sourceReleaseId} нет пути к файлу`,
        severity: "error",
      });
      continue;
    }
    if (!(await fileIsReadable(release.filePath))) {
      errors.push({
        code: "file_unreadable",
        message: `Файл недоступен: ${release.filePath}`,
        severity: "error",
      });
    }
  }

  if (errors.length > 0) throw new ValidationFailed(errors, warnings);

  const inputPaths = new Set<string>();
  for (const track of recipe.tracks) {
    const release = releaseMap.get(track.sourceReleaseId)!;
    inputPaths.add(release.filePath!.trim());
  }

  if (inputPaths.has(outputPath)) {
    errors.push({
      code: "output_equals_input",
      message: "Путь результата не должен совпадать с исходным файлом",
      severity: "error",
    });
  }

  const existingRelease = await prisma.release.findFirst({
    where: { filePath: outputPath },
    select: { id: true },
  });
  if (existingRelease) {
    errors.push({
      code: "output_exists_in_catalog",
      message: "Файл по этому пути уже зарегистрирован как релиз",
      severity: "error",
    });
  }

  const activeJob = await prisma.releaseBuild.findFirst({
    where: {
      outputPath,
      status: { in: ["QUEUED", "RUNNING"] },
    },
    select: { id: true },
  });
  if (activeJob) {
    errors.push({
      code: "output_path_busy",
      message: "На этот путь уже поставлена другая сборка",
      severity: "error",
    });
  }

  if (errors.length > 0) throw new ValidationFailed(errors, warnings);

  for (const releaseId of new Set(recipe.tracks.map((t) => t.sourceReleaseId))) {
    const release = releaseMap.get(releaseId)!;
    const info = await inspectReleaseFile(releaseId, release.filePath!.trim());
    inspected.set(releaseId, info);
  }

  const videoTrack = videoTracks[0]!;
  const videoInspected = inspected.get(videoTrack.sourceReleaseId)!;
  const videoDuration =
    videoInspected.exactDurationSeconds ?? videoInspected.durationSeconds;

  if (!videoInspected.probe.video) {
    errors.push({
      code: "no_video_stream",
      message: "В видео-источнике не найден видеопоток",
      severity: "error",
    });
  } else if (
    videoInspected.probe.video.streamIndex !== videoTrack.sourceStreamIndex
  ) {
    errors.push({
      code: "video_stream_missing",
      message: `Видеопоток ${videoTrack.sourceStreamIndex} не найден в источнике`,
      severity: "error",
    });
  }

  for (const track of recipe.tracks) {
    const info = inspected.get(track.sourceReleaseId)!;
    if (track.kind === "audio") {
      const audio = info.probe.audio.find(
        (a) => a.streamIndex === track.sourceStreamIndex,
      );
      if (!audio) {
        errors.push({
          code: "audio_stream_missing",
          message: `Аудиопоток ${track.sourceStreamIndex} не найден`,
          severity: "error",
        });
        continue;
      }
      const mode = track.audioMode ?? "copy";
      if (mode === "transcode") {
        const codec = track.transcodeCodec as TranscodeCodec | undefined;
        if (!codec || !track.transcodeBitrate) {
          errors.push({
            code: "transcode_params",
            message: "Неполные параметры перекодирования",
            severity: "error",
          });
        } else if (!isValidBitrate(codec, track.transcodeBitrate)) {
          errors.push({
            code: "invalid_bitrate",
            message: `Битрейт ${track.transcodeBitrate} не поддерживается для ${codec}`,
            severity: "error",
          });
        }
      }
      if (!info.mkv) {
        warnings.push({
          code: "mkvmerge_unavailable",
          message: `mkvmerge не смог прочитать ${path.basename(info.filePath)} — сборка может не удаться`,
          severity: "warning",
        });
      } else {
        const mkvId = resolveMkvTrackIdForStream(
          info,
          "audio",
          track.sourceStreamIndex,
        );
        if (mkvId == null) {
          errors.push({
            code: "mkv_audio_track_missing",
            message: `Аудиодорожка ${track.sourceStreamIndex} не сопоставлена с mkvmerge`,
            severity: "error",
          });
        }
      }
      warnings.push(
        ...durationDeltaWarnings(
          videoDuration,
          info.exactDurationSeconds ?? info.durationSeconds,
          trackLabel(track, info),
        ),
      );
    }
    if (track.kind === "subtitle") {
      const sub = info.probe.subtitles.find(
        (s) => s.streamIndex === track.sourceStreamIndex,
      );
      if (!sub) {
        errors.push({
          code: "subtitle_stream_missing",
          message: `Субтитр ${track.sourceStreamIndex} не найден`,
          severity: "error",
        });
      }
    }
  }

  if (errors.length > 0) throw new ValidationFailed(errors, warnings);

  return {
    recipe: { ...recipe, outputPath },
    warnings,
    inspected,
    videoSourceReleaseId: videoTrack.sourceReleaseId,
    videoDurationSeconds: videoDuration,
  };
}

export class ValidationFailed extends Error {
  constructor(
    public readonly errors: BuildWarning[],
    public readonly warnings: BuildWarning[],
  ) {
    super(errors[0]?.message ?? "Ошибка валидации");
    this.name = "ValidationFailed";
  }
}

export function requireWarningAck(
  warnings: BuildWarning[],
  acknowledgeWarnings?: boolean,
): void {
  const blocking = warnings.filter((w) => w.severity === "warning");
  if (blocking.length > 0 && !acknowledgeWarnings) {
    throw new ValidationFailed(
      [
        {
          code: "warnings_not_acknowledged",
          message: "Подтвердите предупреждения перед запуском сборки",
          severity: "error",
        },
      ],
      warnings,
    );
  }
}
