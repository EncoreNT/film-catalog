import { z } from "zod";

export const kinoriumSearchSchema = z.object({
  q: z
    .string()
    .trim()
    .min(2, "Введите хотя бы два символа")
    .max(200, "Название слишком длинное"),
  year: z.coerce
    .number({ error: "Некорректный год" })
    .int("Укажите целый год")
    .min(1800, "Год должен быть не раньше 1800")
    .max(2200, "Год должен быть не позже 2200")
    .optional(),
});

export const kinoriumIdSchema = z.coerce
  .number()
  .int()
  .positive()
  .max(99_999_999);
