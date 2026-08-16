import { z } from "zod";

export const raterCreateSchema = z.object({
  name: z.string().trim().min(1, "Имя не может быть пустым"),
});

export const raterUpdateSchema = z.object({
  name: z.string().trim().min(1, "Имя не может быть пустым"),
});

export const raterReorderSchema = z.object({
  ids: z.array(z.number().int().positive()).min(1),
});

export const movieRatingSetSchema = z.object({
  raterId: z.number().int().positive(),
  rating: z.number().int().min(1).max(10),
});

export const movieRatingClearSchema = z.object({
  raterId: z.number().int().positive(),
});
