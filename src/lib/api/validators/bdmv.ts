import { z } from "zod";

export const bdmvInspectSchema = z.object({
  bdmvPath: z.string().min(1),
  playlistPath: z.string().min(1).optional(),
});

export const bdmvRemuxTrackSchema = z.object({
  kind: z.enum(["video", "audio", "subtitle"]),
  sourceStreamIndex: z.number().int().min(0),
  label: z.string().max(200).optional(),
  isDefault: z.boolean().optional(),
  forced: z.boolean().optional(),
});

export const bdmvRemuxCreateSchema = z
  .object({
    bdmvRoot: z.string().min(1),
    playlistPath: z.string().min(1),
    outputPath: z.string().min(1),
    outputReleaseType: z.string().optional(),
    outputVersion: z.string().optional(),
    externalStorageId: z.number().int().nullable().optional(),
    moviePartId: z.number().int().nullable().optional(),
    acknowledgeWarnings: z.boolean().optional(),
    tracks: z.array(bdmvRemuxTrackSchema).min(1),
  })
  .refine((data) => data.tracks.some((track) => track.kind === "video"), {
    message: "В составе должна быть видеодорожка",
    path: ["tracks"],
  });
