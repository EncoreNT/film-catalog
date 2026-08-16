import { access } from "node:fs/promises";
import { constants } from "node:fs";
import { prisma } from "@/lib/db/prisma";
import { displayFilePath, resolveRuntimePath } from "@/lib/shared/display-path";
import {
  DEFAULT_MOVIE_LIST_LIMIT,
  DEFAULT_MOVIE_LIST_ORDER,
  DEFAULT_MOVIE_LIST_SORT,
} from "@/lib/movies/movie-list-defaults";
import {
  BUILD_TRANSCODE_MAX_CONCURRENCY,
  idealTranscodeBitrate,
  type TranscodeCodec,
} from "@/lib/builds/build-presets";

const SCAN_ROOT_KEY = "scanRoot";
const EXPORT_TARGET_DIR_KEY = "exportTargetDir";
const CATALOG_PAGE_SIZE_KEY = "catalog.pageSize";
const CATALOG_DEFAULT_SORT_KEY = "catalog.defaultSort";
const BUILDS_TRANSCODE_CONCURRENCY_KEY = "builds.transcodeConcurrency";
const BUILDS_DEFAULT_AC3_BITRATE_KEY = "builds.defaultAc3Bitrate";
const BUILDS_DEFAULT_EAC3_BITRATE_KEY = "builds.defaultEac3Bitrate";

async function getSettingValue(key: string): Promise<string | null> {
  const setting = await prisma.setting.findUnique({ where: { key } });
  return setting?.value ?? null;
}

async function setSettingValue(key: string, value: string): Promise<void> {
  await prisma.setting.upsert({
    where: { key },
    create: { key, value },
    update: { value },
  });
}

async function getIntSetting(key: string, fallback: number): Promise<number> {
  const raw = await getSettingValue(key);
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export async function getScanRoot(): Promise<string | null> {
  const setting = await getSettingValue(SCAN_ROOT_KEY);
  if (setting) return setting;
  return process.env.SCAN_ROOT ?? null;
}

export async function setScanRoot(path: string): Promise<void> {
  const runtimePath = resolveRuntimePath(path);
  await setSettingValue(SCAN_ROOT_KEY, runtimePath);
}

export async function assertDirectoryWritable(dirPath: string): Promise<void> {
  try {
    await access(dirPath, constants.R_OK | constants.W_OK | constants.X_OK);
  } catch {
    throw new Error(`Папка недоступна или не существует: ${displayFilePath(dirPath)}`);
  }
}

export function scanRootDisplay(runtimePath: string | null): string | null {
  if (!runtimePath) return null;
  return displayFilePath(runtimePath);
}

export async function getExportTargetDir(): Promise<string | null> {
  return getSettingValue(EXPORT_TARGET_DIR_KEY);
}

export async function setExportTargetDir(path: string): Promise<void> {
  const runtimePath = resolveRuntimePath(path);
  await setSettingValue(EXPORT_TARGET_DIR_KEY, runtimePath);
}

export function exportTargetDirDisplay(runtimePath: string | null): string | null {
  if (!runtimePath) return null;
  return displayFilePath(runtimePath);
}

/** Returns saved export folder when it still exists and is writable. */
export async function resolveSavedExportTargetDir(): Promise<{
  runtime: string;
  display: string;
} | null> {
  const saved = await getExportTargetDir();
  if (!saved) return null;
  try {
    await assertDirectoryWritable(saved);
    return { runtime: saved, display: displayFilePath(saved) };
  } catch {
    return null;
  }
}

export async function getCatalogPageSize(): Promise<number> {
  const value = await getIntSetting(CATALOG_PAGE_SIZE_KEY, DEFAULT_MOVIE_LIST_LIMIT);
  return Math.min(100, Math.max(1, value));
}

export async function setCatalogPageSize(value: number): Promise<void> {
  await setSettingValue(CATALOG_PAGE_SIZE_KEY, String(value));
}

export async function getCatalogDefaultSort(): Promise<string> {
  return (await getSettingValue(CATALOG_DEFAULT_SORT_KEY)) ?? DEFAULT_MOVIE_LIST_SORT;
}

export async function setCatalogDefaultSort(value: string): Promise<void> {
  await setSettingValue(CATALOG_DEFAULT_SORT_KEY, value);
}

export async function getCatalogDefaultOrder(): Promise<"asc" | "desc"> {
  return DEFAULT_MOVIE_LIST_ORDER;
}

export async function getBuildTranscodeConcurrency(): Promise<number> {
  const value = await getIntSetting(
    BUILDS_TRANSCODE_CONCURRENCY_KEY,
    BUILD_TRANSCODE_MAX_CONCURRENCY,
  );
  return Math.min(8, Math.max(1, value));
}

export async function setBuildTranscodeConcurrency(value: number): Promise<void> {
  await setSettingValue(BUILDS_TRANSCODE_CONCURRENCY_KEY, String(value));
}

export async function getDefaultAc3Bitrate(): Promise<number> {
  return getIntSetting(BUILDS_DEFAULT_AC3_BITRATE_KEY, idealTranscodeBitrate("ac3"));
}

export async function setDefaultAc3Bitrate(value: number): Promise<void> {
  await setSettingValue(BUILDS_DEFAULT_AC3_BITRATE_KEY, String(value));
}

export async function getDefaultEac3Bitrate(): Promise<number> {
  return getIntSetting(BUILDS_DEFAULT_EAC3_BITRATE_KEY, idealTranscodeBitrate("eac3"));
}

export async function setDefaultEac3Bitrate(value: number): Promise<void> {
  await setSettingValue(BUILDS_DEFAULT_EAC3_BITRATE_KEY, String(value));
}

export async function getConfiguredIdealTranscodeBitrate(
  codec: TranscodeCodec,
): Promise<number> {
  return codec === "ac3"
    ? getDefaultAc3Bitrate()
    : getDefaultEac3Bitrate();
}

export type AppSettingsSnapshot = {
  scanRoot: string | null;
  scanRootDisplay: string | null;
  exportTargetDir: string | null;
  exportTargetDirDisplay: string | null;
  catalogPageSize: number;
  catalogDefaultSort: string;
  catalogDefaultOrder: "asc" | "desc";
  buildTranscodeConcurrency: number;
  defaultAc3Bitrate: number;
  defaultEac3Bitrate: number;
};

export async function getAppSettingsSnapshot(): Promise<AppSettingsSnapshot> {
  const [scanRoot, exportTargetDir, catalogPageSize, catalogDefaultSort] =
    await Promise.all([
      getScanRoot(),
      getExportTargetDir(),
      getCatalogPageSize(),
      getCatalogDefaultSort(),
    ]);

  const [
    buildTranscodeConcurrency,
    defaultAc3Bitrate,
    defaultEac3Bitrate,
  ] = await Promise.all([
    getBuildTranscodeConcurrency(),
    getDefaultAc3Bitrate(),
    getDefaultEac3Bitrate(),
  ]);

  return {
    scanRoot,
    scanRootDisplay: scanRootDisplay(scanRoot),
    exportTargetDir,
    exportTargetDirDisplay: exportTargetDirDisplay(exportTargetDir),
    catalogPageSize,
    catalogDefaultSort,
    catalogDefaultOrder: DEFAULT_MOVIE_LIST_ORDER,
    buildTranscodeConcurrency,
    defaultAc3Bitrate,
    defaultEac3Bitrate,
  };
}
