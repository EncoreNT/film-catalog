import { access } from "node:fs/promises";
import { constants } from "node:fs";
import { prisma } from "@/lib/db/prisma";
import { displayFilePath, resolveRuntimePath } from "@/lib/shared/display-path";

const SCAN_ROOT_KEY = "scanRoot";
const MEDIA_SAVE_DIR_KEY = "mediaSaveDir";

export async function getScanRoot(): Promise<string | null> {
  const setting = await prisma.setting.findUnique({
    where: { key: SCAN_ROOT_KEY },
  });
  if (setting?.value) return setting.value;
  return process.env.SCAN_ROOT ?? null;
}

export async function setScanRoot(path: string): Promise<void> {
  const runtimePath = resolveRuntimePath(path);
  await prisma.setting.upsert({
    where: { key: SCAN_ROOT_KEY },
    create: { key: SCAN_ROOT_KEY, value: runtimePath },
    update: { value: runtimePath },
  });
}

export async function getMediaSaveDir(): Promise<string | null> {
  const setting = await prisma.setting.findUnique({
    where: { key: MEDIA_SAVE_DIR_KEY },
  });
  return setting?.value ?? null;
}

export async function setMediaSaveDir(inputPath: string): Promise<string> {
  const runtimePath = resolveRuntimePath(inputPath);
  await assertDirectoryWritable(runtimePath);
  await prisma.setting.upsert({
    where: { key: MEDIA_SAVE_DIR_KEY },
    create: { key: MEDIA_SAVE_DIR_KEY, value: runtimePath },
    update: { value: runtimePath },
  });
  return runtimePath;
}

export async function assertDirectoryWritable(dirPath: string): Promise<void> {
  try {
    await access(dirPath, constants.R_OK | constants.W_OK | constants.X_OK);
  } catch {
    throw new Error(`Папка недоступна или не существует: ${displayFilePath(dirPath)}`);
  }
}

export function mediaSaveDirDisplay(runtimePath: string | null): string | null {
  if (!runtimePath) return null;
  return displayFilePath(runtimePath);
}

export function scanRootDisplay(runtimePath: string | null): string | null {
  if (!runtimePath) return null;
  return displayFilePath(runtimePath);
}
