import { readdir, stat } from "node:fs/promises";
import path from "node:path";
import { normalizeFilePathInput } from "@/lib/shared/display-path";

export interface BdmvWarning {
  code: string;
  message: string;
}

export interface ResolvedBdmvRoot {
  bdmvRoot: string;
  playlistDir: string;
  streamDir: string;
  warnings: BdmvWarning[];
}

async function isDirectory(dir: string): Promise<boolean> {
  try {
    const info = await stat(dir);
    return info.isDirectory();
  } catch {
    return false;
  }
}

async function findChildDir(dir: string, name: string): Promise<string | null> {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return null;
  }
  const hit = entries.find(
    (entry) => entry.isDirectory() && entry.name.toLowerCase() === name.toLowerCase(),
  );
  return hit ? path.join(dir, hit.name) : null;
}

async function streamDirBytes(streamDir: string): Promise<number> {
  let entries;
  try {
    entries = await readdir(streamDir, { withFileTypes: true });
  } catch {
    return 0;
  }
  let total = 0;
  for (const entry of entries) {
    if (!entry.isFile()) continue;
    try {
      const info = await stat(path.join(streamDir, entry.name));
      total += info.size;
    } catch {
      // skip unreadable clips
    }
  }
  return total;
}

async function fromBdmvRoot(
  bdmvRoot: string,
  warnings: BdmvWarning[],
): Promise<ResolvedBdmvRoot> {
  const playlistDir = await findChildDir(bdmvRoot, "PLAYLIST");
  if (!playlistDir) {
    throw new Error("Не похоже на Blu-ray: нет каталога BDMV/PLAYLIST");
  }
  const streamDir =
    (await findChildDir(bdmvRoot, "STREAM")) ?? path.join(bdmvRoot, "STREAM");
  return { bdmvRoot, playlistDir, streamDir, warnings };
}

async function collectBdmvDirsAtLevel(dir: string): Promise<string[]> {
  const found: string[] = [];
  const direct = await findChildDir(dir, "BDMV");
  if (direct) found.push(direct);

  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return found;
  }
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    if (entry.name.toLowerCase() === "bdmv") continue;
    const nested = await findChildDir(path.join(dir, entry.name), "BDMV");
    if (nested) found.push(nested);
  }
  return [...new Set(found)];
}

async function pickLargestBdmv(
  candidates: string[],
  warnings: BdmvWarning[],
): Promise<string> {
  if (candidates.length === 1) return candidates[0]!;
  const scored = await Promise.all(
    candidates.map(async (bdmvRoot) => {
      const streamDir = await findChildDir(bdmvRoot, "STREAM");
      const bytes = streamDir ? await streamDirBytes(streamDir) : 0;
      return { bdmvRoot, bytes };
    }),
  );
  scored.sort((a, b) => b.bytes - a.bytes);
  warnings.push({
    code: "multiple-bdmv",
    message: "В папке несколько каталогов BDMV. Выбран диск с большим объёмом STREAM.",
  });
  return scored[0]!.bdmvRoot;
}

export async function resolveBdmvRoot(inputPath: string): Promise<ResolvedBdmvRoot> {
  const normalized = normalizeFilePathInput(inputPath);
  if (!normalized) {
    throw new Error("Укажите папку фильма, каталог BDMV или PLAYLIST");
  }
  if (normalized.toLowerCase().endsWith(".iso")) {
    throw new Error("Нужна распакованная папка BDMV");
  }

  const base = path.resolve(normalized);
  if (!(await isDirectory(base))) {
    throw new Error("Не похоже на Blu-ray: нет каталога BDMV/PLAYLIST");
  }

  const warnings: BdmvWarning[] = [];
  const baseName = path.basename(base);

  if (baseName.toLowerCase() === "playlist") {
    const parent = path.dirname(base);
    const stream = await findChildDir(parent, "STREAM");
    if (stream) return fromBdmvRoot(parent, warnings);
  }

  if (baseName.toLowerCase() === "bdmv") {
    return fromBdmvRoot(base, warnings);
  }

  const candidates = await collectBdmvDirsAtLevel(base);
  if (candidates.length === 0) {
    throw new Error("Не похоже на Blu-ray: нет каталога BDMV/PLAYLIST");
  }
  const chosen = await pickLargestBdmv(candidates, warnings);
  return fromBdmvRoot(chosen, warnings);
}
