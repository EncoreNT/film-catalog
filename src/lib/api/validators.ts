import { z } from "zod";

export const movieStatusSchema = z.enum(["DRAFT", "CATALOG", "EXCLUDED"]);

export const videoInputSchema = z.object({
  width: z.number().int().nullable().optional(),
  height: z.number().int().nullable().optional(),
  resolutionLabel: z.string().nullable().optional(),
  codec: z.string().nullable().optional(),
  hdr: z.string().nullable().optional(),
  fps: z.string().nullable().optional(),
  bitrate: z.number().int().nullable().optional(),
});

export const trackInputSchema = z.object({
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
});

export const subtitleInputSchema = z.object({
  id: z.number().int().optional(),
  streamIndex: z.number().int(),
  codec: z.string().nullable().optional(),
  codecLabel: z.string().nullable().optional(),
  language: z.string().nullable().optional(),
  title: z.string().nullable().optional(),
  isDefault: z.boolean().optional(),
  forced: z.boolean().optional(),
});

/** Work-level movie fields (title, year, rating, genres, status). */
export const movieUpdateSchema = z.object({
  title: z.string().min(1).optional(),
  year: z.number().int().min(1900).max(2100).nullable().optional(),
  description: z.string().nullable().optional(),
  rating: z.number().int().min(1).max(10).nullable().optional(),
  watchedAt: z.string().datetime().nullable().optional(),
  status: movieStatusSchema.optional(),
  genres: z.array(z.string().min(1)).optional(),
});

/** File-level release fields (path, tracks, releaseType, version). */
export const releaseUpdateSchema = z.object({
  filePath: z.string().nullable().optional(),
  fileSize: z.number().int().min(0).nullable().optional(),
  fileMtime: z.string().datetime().nullable().optional(),
  fileHash: z.string().nullable().optional(),
  externalStorageId: z.number().int().nullable().optional(),
  releaseType: z.string().nullable().optional(),
  version: z.string().nullable().optional(),
  durationSeconds: z.number().int().min(0).nullable().optional(),
  videoTrack: videoInputSchema.optional(),
  audioTracks: z.array(trackInputSchema).optional(),
  subtitleTracks: z.array(subtitleInputSchema).optional(),
});

const createTrackInputSchema = trackInputSchema.omit({ id: true }).extend({
  streamIndex: z.number().int().optional(),
});

const createSubtitleInputSchema = subtitleInputSchema.omit({ id: true }).extend({
  streamIndex: z.number().int().optional(),
});

export const releaseCreateSchema = z.object({
  filePath: z.string().nullable().optional(),
  externalStorageId: z.number().int().nullable().optional(),
  releaseType: z.string().nullable().optional(),
  version: z.string().nullable().optional(),
  durationSeconds: z.number().int().min(0).nullable().optional(),
  videoTrack: videoInputSchema.optional(),
  audioTracks: z.array(createTrackInputSchema).optional(),
  subtitleTracks: z.array(createSubtitleInputSchema).optional(),
  skipProbe: z.boolean().optional(),
  probeOnly: z.boolean().optional(),
});

/** Create movie (work-level) + optional first release. */
export const movieCreateSchema = z.object({
  title: z.string().min(1),
  year: z.number().int().min(1900).max(2100).nullable().optional(),
  description: z.string().nullable().optional(),
  genres: z.array(z.string().min(1)).optional(),
  status: movieStatusSchema.optional(),
  release: releaseCreateSchema.optional(),
  // Legacy flat fields — mapped to release on create
  filePath: z.string().nullable().optional(),
  externalStorageId: z.number().int().nullable().optional(),
  releaseType: z.string().nullable().optional(),
  version: z.string().nullable().optional(),
  durationSeconds: z.number().int().min(0).nullable().optional(),
  videoTrack: videoInputSchema.optional(),
  audioTracks: z.array(createTrackInputSchema).optional(),
  subtitleTracks: z.array(createSubtitleInputSchema).optional(),
  skipProbe: z.boolean().optional(),
  probeOnly: z.boolean().optional(),
});

export const mergeSchema = z.object({
  otherId: z.number().int(),
  choices: z
    .object({
      description: z.enum(["canonical", "other"]).optional(),
      coverPath: z.enum(["canonical", "other"]).optional(),
      rating: z.enum(["canonical", "other"]).optional(),
      watchedAt: z.enum(["canonical", "other"]).optional(),
    })
    .optional(),
});

export const movieListQuerySchema = z.object({
  q: z.string().optional(),
  resolution: z.string().optional(),
  hdr: z.string().optional(),
  premiumAudio: z.string().optional(),
  multiRelease: z.string().optional(),
  language: z.string().optional(),
  subtitleLang: z.string().optional(),
  channelLayout: z.string().optional(),
  genre: z.string().optional(),
  audioScope: z.string().optional(),
  audioChannels: z.string().optional(),
  audioFormat: z.string().optional(),
  audioTranslation: z.string().optional(),
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

export const scanRootSchema = z.object({
  scanRoot: z.string().min(1),
});

export const scanRequestSchema = scanRootSchema.extend({
  /** Set when scanning files on a named external drive; omit/null for local disk. */
  externalStorageId: z.number().int().nullable().optional(),
});

export const externalStorageCreateSchema = z.object({
  name: z.string().min(1),
  path: z.string().nullable().optional(),
});

export const franchiseSlotInputSchema = z.object({
  movieId: z.number().int().nullable().optional(),
  storyOrder: z.number().int(),
  titleHint: z.string().nullable().optional(),
  yearHint: z.number().int().min(1900).max(2100).nullable().optional(),
});

export const franchiseCreateSchema = z.object({
  name: z.string().min(1),
  description: z.string().nullable().optional(),
  coverPath: z.string().nullable().optional(),
  slots: z.array(franchiseSlotInputSchema).optional(),
});

export const franchiseUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  coverPath: z.string().nullable().optional(),
  slots: z.array(franchiseSlotInputSchema).optional(),
});

export const franchiseListQuerySchema = z.object({
  q: z.string().optional(),
  sort: z.enum(["name", "createdAt", "slotCount"]).optional(),
  order: z.enum(["asc", "desc"]).optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

export const movieFranchiseAttachSchema = z
  .object({
    franchiseId: z.number().int().optional(),
    name: z.string().min(1).optional(),
    target: z.unknown().optional(),
  })
  .refine(
    (data) => (data.name && data.name.trim().length > 0) || data.franchiseId != null,
    { message: "Укажите franchiseId или name" },
  );
