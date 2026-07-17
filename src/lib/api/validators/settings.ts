import { z } from "zod";

export const settingsPatchSchema = z
  .object({
    scanRoot: z.string().min(1).optional(),
    mediaSaveDir: z.string().min(1).optional(),
  })
  .refine((data) => data.scanRoot != null || data.mediaSaveDir != null, {
    message: "Укажите хотя бы одно поле",
  });

export type SettingsPatchInput = z.infer<typeof settingsPatchSchema>;
