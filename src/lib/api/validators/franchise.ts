import { z } from "zod";

export const franchiseSlotInputSchema = z.object({
  movieId: z.number().int().nullable().optional(),
  storyOrder: z.number().int(),
  titleHint: z.string().nullable().optional(),
  yearHint: z.number().int().min(1900).max(2100).nullable().optional(),
  isAnnounced: z.boolean().optional(),
});

export const franchisePlacementSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("end") }),
  z.object({ kind: z.literal("before"), slotId: z.number().int() }),
  z.object({ kind: z.literal("fill"), slotId: z.number().int() }),
]);

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
