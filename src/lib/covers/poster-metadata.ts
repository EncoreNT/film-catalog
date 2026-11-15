import { mkdir, readFile, readdir, rename, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import lockfile from "proper-lockfile";
import sharp from "sharp";
import { z } from "zod";
import { dataPath } from "@/lib/db/data-path";
import { isCoverImageExtension } from "./cover-formats";
import type { PosterFileMetadata } from "./poster-quality";

const metadataSchema = z.object({
  status: z.enum(["ready", "unreadable"]),
  width: z.number().int().positive().nullable(),
  height: z.number().int().positive().nullable(),
  format: z.string().nullable(),
  bytes: z.number().nonnegative(),
  mtimeMs: z.number().nonnegative(),
  ctimeMs: z.number().nonnegative(),
  checkedAt: z.iso.datetime(),
});
const indexSchema = z.object({
  version: z.literal(1),
  updatedAt: z.iso.datetime(),
  files: z.record(z.string(), metadataSchema),
});
type PosterMetadataIndex = z.infer<typeof indexSchema>;

function isCoverFilename(filename: string): boolean {
  return filename === path.basename(filename) && !filename.includes("\\") &&
    isCoverImageExtension(path.extname(filename));
}

export function posterMetadataForPath(
  files: Record<string, PosterFileMetadata>,
  coverPath: string | null,
): PosterFileMetadata | null {
  if (!coverPath?.startsWith("covers/")) return null;
  const filename = coverPath.slice("covers/".length);
  return isCoverFilename(filename) ? files[filename] ?? null : null;
}

/** Derived cache only. This module never imports Prisma or alters cover images. */
export function createPosterMetadataStore(coversDir: string) {
  const indexPath = path.join(coversDir, "poster-metadata.json");

  async function load(): Promise<PosterMetadataIndex | null> {
    try {
      const content = await readFile(indexPath, "utf8");
      return indexSchema.safeParse(JSON.parse(content)).data ?? null;
    } catch (error) {
      if (error instanceof SyntaxError || (error as NodeJS.ErrnoException).code === "ENOENT") return null;
      throw error;
    }
  }

  async function locked<T>(action: (assertLock: () => void) => Promise<T>): Promise<T> {
    await mkdir(coversDir, { recursive: true });
    let compromised: Error | null = null;
    const release = await lockfile.lock(indexPath, {
      realpath: false,
      stale: 30_000,
      update: 10_000,
      retries: { retries: 100, minTimeout: 50, maxTimeout: 200, factor: 1.2 },
      onCompromised: (error) => { compromised = error; },
    });
    try {
      return await action(() => { if (compromised) throw compromised; });
    } finally {
      await release().catch((error) => { if (!compromised) throw error; });
    }
  }

  async function save(files: Record<string, PosterFileMetadata>, assertLock: () => void) {
    const index: PosterMetadataIndex = { version: 1, updatedAt: new Date().toISOString(), files };
    const temp = `${indexPath}.${randomUUID()}.tmp`;
    try {
      await writeFile(temp, JSON.stringify(index, null, 2) + "\n");
      assertLock();
      await rename(temp, indexPath);
    } finally {
      await rm(temp, { force: true });
    }
    return index;
  }

  async function inspect(filename: string, cached?: PosterFileMetadata, force = false): Promise<PosterFileMetadata | null> {
    const filePath = path.join(coversDir, filename);
    for (let attempt = 0; attempt < 2; attempt++) {
      let before;
      try {
        before = await stat(filePath);
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
        throw error;
      }
      if (!before.isFile()) return null;
      if (!force && cached && cached.bytes === before.size &&
          cached.mtimeMs === before.mtimeMs && cached.ctimeMs === before.ctimeMs) return cached;
      let dimensions: Pick<PosterFileMetadata, "status" | "width" | "height" | "format"> = {
        status: "unreadable", width: null, height: null, format: null,
      };
      try {
        const metadata = await sharp(filePath).metadata();
        const width = metadata.width;
        const height = metadata.pageHeight ?? metadata.height;
        if (width && height) {
          const rotated = metadata.orientation != null && metadata.orientation >= 5;
          dimensions = {
            status: "ready", width: rotated ? height : width,
            height: rotated ? width : height, format: metadata.format ?? null,
          };
        }
      } catch { /* Keep an explicit unreadable state, not a low-resolution rating. */ }
      const after = await stat(filePath).catch(() => null);
      if (!after) return null;
      // A save can be writing the image while a scan is reading its header.
      if (before.size !== after.size || before.mtimeMs !== after.mtimeMs || before.ctimeMs !== after.ctimeMs) continue;
      return { ...dimensions, bytes: after.size, mtimeMs: after.mtimeMs,
        ctimeMs: after.ctimeMs, checkedAt: new Date().toISOString() };
    }
    return null; // Retry on the next refresh instead of caching a partial write.
  }

  return {
    /** Initial backfill + cheap stat-based reconciliation for later visits. */
    refresh(force = false): Promise<PosterMetadataIndex> {
      return locked(async (assertLock) => {
        const previous = await load();
        const files: Record<string, PosterFileMetadata> = {};
        const entries = await readdir(coversDir, { withFileTypes: true });
        for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
          if (!entry.isFile() || !isCoverFilename(entry.name)) continue;
          const metadata = await inspect(entry.name, previous?.files[entry.name], force);
          if (metadata) files[entry.name] = metadata;
        }
        if (previous && JSON.stringify(previous.files) === JSON.stringify(files)) return previous;
        return save(files, assertLock);
      });
    },
    /** Upsert only the newly saved file, removing entries for its old extensions. */
    update(filename: string): Promise<PosterMetadataIndex> {
      if (!isCoverFilename(filename)) return Promise.reject(new Error("Invalid cover filename"));
      return locked(async (assertLock) => {
        const previous = await load();
        const files = previous?.files ?? {};
        const base = path.parse(filename).name;
        for (const key of Object.keys(files)) {
          if (path.parse(key).name === base) delete files[key];
        }
        const metadata = await inspect(filename);
        if (metadata) files[filename] = metadata;
        return save(files, assertLock);
      });
    },
  };
}

export const posterMetadataStore = createPosterMetadataStore(dataPath("covers"));

/** Cache failure must not turn an already written cover into a failed upload. */
export async function recordPosterMetadata(filename: string): Promise<void> {
  try {
    await posterMetadataStore.update(filename);
  } catch (error) {
    console.warn("Не удалось обновить метаданные постера; следующая проверка повторит чтение.", error);
  }
}
