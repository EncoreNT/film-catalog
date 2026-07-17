import { z } from "zod";
import {
  CHANNEL_TARGETS,
  MAX_OFFSET_MS,
  MIN_OFFSET_MS,
  TRANSCODE_CODECS,
} from "@/lib/builds/build-presets";

export const buildTrackKindSchema = z.enum(["video", "audio", "subtitle"]);

export const buildAudioModeSchema = z.enum(["copy", "transcode"]);

export const buildChannelTargetSchema = z.enum(CHANNEL_TARGETS);

export const buildTranscodeCodecSchema = z.enum(TRANSCODE_CODECS);

export const buildRecipeTrackSchema = z
  .object({
    kind: buildTrackKindSchema,
    sourceReleaseId: z.number().int().positive(),
    sourceStreamIndex: z.number().int().min(0),
    audioMode: buildAudioModeSchema.optional(),
    transcodeCodec: buildTranscodeCodecSchema.optional(),
    transcodeBitrate: z.number().int().positive().optional(),
    channelTarget: buildChannelTargetSchema.optional(),
    offsetMs: z.number().int().min(MIN_OFFSET_MS).max(MAX_OFFSET_MS).optional(),
    isDefault: z.boolean().optional(),
    forced: z.boolean().optional(),
    keepOriginal: z.boolean().optional(),
    label: z.string().max(200).optional(),
  })
  .superRefine((track, ctx) => {
    if (track.kind === "video") {
      if (track.audioMode || track.transcodeCodec || track.transcodeBitrate) {
        ctx.addIssue({
          code: "custom",
          message: "Видеодорожка не поддерживает параметры аудио",
        });
      }
      if (track.offsetMs && track.offsetMs !== 0) {
        ctx.addIssue({
          code: "custom",
          message: "Сдвиг доступен только для аудио",
        });
      }
    }
    if (track.kind === "audio") {
      const mode = track.audioMode ?? "copy";
      if (mode === "transcode") {
        if (!track.transcodeCodec) {
          ctx.addIssue({
            code: "custom",
            message: "Укажите кодек перекодирования",
          });
        }
        if (!track.transcodeBitrate) {
          ctx.addIssue({
            code: "custom",
            message: "Укажите битрейт перекодирования",
          });
        }
        if (!track.channelTarget) {
          ctx.addIssue({
            code: "custom",
            message: "Укажите целевую конфигурацию каналов",
          });
        }
      } else if (
        track.transcodeCodec ||
        track.transcodeBitrate ||
        track.channelTarget
      ) {
        ctx.addIssue({
          code: "custom",
          message: "Параметры перекодирования нужны только в режиме transcode",
        });
      }
    }
    if (track.kind === "subtitle" && track.audioMode) {
      ctx.addIssue({
        code: "custom",
        message: "Субтитры не поддерживают режим аудио",
      });
    }
  });

export const buildRecipeSchema = z.object({
  tracks: z.array(buildRecipeTrackSchema).min(1),
  outputPath: z.string().min(1),
  outputReleaseType: z.string().nullable().optional(),
  outputVersion: z.string().optional(),
  externalStorageId: z.number().int().positive().nullable().optional(),
});

export const buildValidateSchema = buildRecipeSchema;

export const buildCreateSchema = buildRecipeSchema.extend({
  acknowledgeWarnings: z.boolean().optional(),
});

export const buildListQuerySchema = z.object({
  movieId: z.coerce.number().int().positive().optional(),
  status: z
    .enum(["QUEUED", "RUNNING", "SUCCEEDED", "FAILED", "CANCELLED"])
    .optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

export const buildReorderQueueSchema = z.object({
  orderedIds: z.array(z.number().int().positive()).min(1),
});
