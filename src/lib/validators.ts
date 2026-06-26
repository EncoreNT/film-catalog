import { z } from "zod";

export const movieStatusSchema = z.enum(["DRAFT", "CATALOG", "EXCLUDED"]);
export const storageTypeSchema = z.enum(["LOCAL", "EXTERNAL"]);

export const movieUpdateSchema = z.object({
  title: z.string().min(1).optional(),
  year: z.number().int().min(1900).max(2100).nullable().optional(),
  description: z.string().nullable().optional(),
  durationSeconds: z.number().int().min(0).nullable().optional(),
  rating: z.number().int().min(1).max(10).nullable().optional(),
  watchedAt: z.string().datetime().nullable().optional(),
  status: movieStatusSchema.optional(),
  filePath: z.string().nullable().optional(),
  storageId: z.number().int().nullable().optional(),
  releaseType: z.string().nullable().optional(),
  genres: z.array(z.string().min(1)).optional(),
  videoTrack: z
    .object({
      width: z.number().int().nullable().optional(),
      height: z.number().int().nullable().optional(),
      resolutionLabel: z.string().nullable().optional(),
      codec: z.string().nullable().optional(),
      hdr: z.string().nullable().optional(),
      fps: z.string().nullable().optional(),
      bitrate: z.number().int().nullable().optional(),
    })
    .optional(),
  audioTracks: z
    .array(
      z.object({
        id: z.number().int().optional(),
        streamIndex: z.number().int(),
        codec: z.string().nullable().optional(),
        profile: z.string().nullable().optional(),
        channels: z.number().int().nullable().optional(),
        channelLayout: z.string().nullable().optional(),
        bitrate: z.number().int().nullable().optional(),
        language: z.string().nullable().optional(),
        translationType: z.string().nullable().optional(),
        title: z.string().nullable().optional(),
        isDefault: z.boolean().optional(),
      }),
    )
    .optional(),
  subtitleTracks: z
    .array(
      z.object({
        id: z.number().int().optional(),
        streamIndex: z.number().int(),
        codec: z.string().nullable().optional(),
        codecLabel: z.string().nullable().optional(),
        language: z.string().nullable().optional(),
        title: z.string().nullable().optional(),
        isDefault: z.boolean().optional(),
        forced: z.boolean().optional(),
      }),
    )
    .optional(),
});

const trackInputSchema = z.object({
  streamIndex: z.number().int().optional(),
  codec: z.string().nullable().optional(),
  profile: z.string().nullable().optional(),
  channels: z.number().int().nullable().optional(),
  channelLayout: z.string().nullable().optional(),
  bitrate: z.number().int().nullable().optional(),
  language: z.string().nullable().optional(),
  translationType: z.string().nullable().optional(),
  title: z.string().nullable().optional(),
  isDefault: z.boolean().optional(),
});

const subtitleInputSchema = z.object({
  streamIndex: z.number().int().optional(),
  codec: z.string().nullable().optional(),
  codecLabel: z.string().nullable().optional(),
  language: z.string().nullable().optional(),
  title: z.string().nullable().optional(),
  isDefault: z.boolean().optional(),
  forced: z.boolean().optional(),
});

const videoInputSchema = z.object({
  width: z.number().int().nullable().optional(),
  height: z.number().int().nullable().optional(),
  resolutionLabel: z.string().nullable().optional(),
  codec: z.string().nullable().optional(),
  hdr: z.string().nullable().optional(),
  fps: z.string().nullable().optional(),
  bitrate: z.number().int().nullable().optional(),
});

export const movieCreateSchema = z.object({
  title: z.string().min(1),
  year: z.number().int().min(1900).max(2100).nullable().optional(),
  description: z.string().nullable().optional(),
  durationSeconds: z.number().int().min(0).nullable().optional(),
  filePath: z.string().nullable().optional(),
  storageId: z.number().int().nullable().optional(),
  releaseType: z.string().nullable().optional(),
  genres: z.array(z.string().min(1)).optional(),
  status: movieStatusSchema.optional(),
  videoTrack: videoInputSchema.optional(),
  audioTracks: z.array(trackInputSchema).optional(),
  subtitleTracks: z.array(subtitleInputSchema).optional(),
  skipProbe: z.boolean().optional(),
  probeOnly: z.boolean().optional(),
});

export const movieListQuerySchema = z.object({
  q: z.string().optional(),
  resolution: z.string().optional(),
  hdr: z.string().optional(),
  premiumAudio: z.string().optional(),
  language: z.string().optional(),
  subtitleLang: z.string().optional(),
  channelLayout: z.string().optional(),
  genre: z.string().optional(),
  status: z.string().optional(),
  minRating: z.coerce.number().int().min(1).max(10).optional(),
  minDuration: z.coerce.number().int().min(0).optional(),
  maxDuration: z.coerce.number().int().min(0).optional(),
  watched: z.enum(["all", "watched", "unwatched"]).optional(),
  watchedFrom: z.string().optional(),
  watchedTo: z.string().optional(),
  sort: z
    .enum(["title", "year", "createdAt", "rating", "watchedAt", "durationSeconds"])
    .optional(),
  order: z.enum(["asc", "desc"]).optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

export const bulkActionSchema = z.object({
  ids: z.array(z.number().int()),
  action: z.enum(["approve", "exclude"]),
});

export const scanRootSchema = z.object({
  scanRoot: z.string().min(1),
});

export const storageCreateSchema = z.object({
  name: z.string().min(1),
  type: storageTypeSchema,
  path: z.string().nullable().optional(),
});

export const storageUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  type: storageTypeSchema.optional(),
  path: z.string().nullable().optional(),
});
