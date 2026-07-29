import { z } from "zod";

export const remakeRoleSchema = z.enum([
  "ORIGINAL",
  "REMAKE",
  "REIMAGINING",
  "REBOOT",
  "ADAPTATION",
]);

export const remakeMemberInputSchema = z.object({
  movieId: z.number().int(),
  role: remakeRoleSchema,
});

export const remakeGroupCreateSchema = z.object({
  name: z.string().min(1),
  description: z.string().nullable().optional(),
  members: z.array(remakeMemberInputSchema).optional(),
});

export const remakeGroupUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  members: z.array(remakeMemberInputSchema).optional(),
});

export const remakeAttachSchema = z
  .object({
    groupId: z.number().int().optional(),
    name: z.string().min(1).optional(),
    role: remakeRoleSchema,
  })
  .refine(
    (data) => (data.name && data.name.trim().length > 0) || data.groupId != null,
    { message: "Укажите groupId или name" },
  );

export const remakeRoleUpdateSchema = z.object({
  role: remakeRoleSchema,
});

export const remakeGroupListQuerySchema = z.object({
  q: z.string().optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});
