import { z } from "zod";

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
