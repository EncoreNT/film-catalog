import { z } from "zod";

export const wslDriveMountSchema = z.object({
  path: z.string().trim().min(1, "Укажите путь"),
});
