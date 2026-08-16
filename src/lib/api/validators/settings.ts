import { z } from "zod";
import { AC3_BITRATES, EAC3_BITRATES } from "@/lib/builds/build-presets";

export const settingsUpdateSchema = z.object({
  scanRoot: z.string().nullable().optional(),
  exportTargetDir: z.string().nullable().optional(),
  catalogPageSize: z.number().int().min(1).max(100).optional(),
  catalogDefaultSort: z
    .enum([
      "title",
      "year",
      "createdAt",
      "rating",
      "watchedAt",
      "durationSeconds",
      "fileSize",
      "fileDownloadedAt",
    ])
    .optional(),
  buildTranscodeConcurrency: z.number().int().min(1).max(8).optional(),
  defaultAc3Bitrate: z.coerce
    .number()
    .int()
    .refine((v) => AC3_BITRATES.includes(v as (typeof AC3_BITRATES)[number]))
    .optional(),
  defaultEac3Bitrate: z.coerce
    .number()
    .int()
    .refine((v) => EAC3_BITRATES.includes(v as (typeof EAC3_BITRATES)[number]))
    .optional(),
});
