import { prisma } from "./prisma";

const SCAN_ROOT_KEY = "scanRoot";

export async function getScanRoot(): Promise<string | null> {
  const setting = await prisma.setting.findUnique({
    where: { key: SCAN_ROOT_KEY },
  });
  if (setting?.value) return setting.value;
  return process.env.SCAN_ROOT ?? null;
}

export async function setScanRoot(path: string): Promise<void> {
  await prisma.setting.upsert({
    where: { key: SCAN_ROOT_KEY },
    create: { key: SCAN_ROOT_KEY, value: path },
    update: { value: path },
  });
}
