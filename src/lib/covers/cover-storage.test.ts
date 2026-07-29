import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { access, mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { constants } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

vi.mock("@/lib/db/data-path", () => ({
  dataPath: (...segments: string[]) => {
    const base = (globalThis as { __coversTestDir?: string }).__coversTestDir;
    if (!base) throw new Error("test covers dir not set");
    return path.join(base, ...segments);
  },
}));

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

describe("removeStaleEntityCovers", () => {
  let tempRoot: string;

  beforeEach(async () => {
    vi.resetModules();
    tempRoot = await mkdtemp(path.join(tmpdir(), "fc-covers-"));
    await mkdir(path.join(tempRoot, "covers"), { recursive: true });
    (globalThis as { __coversTestDir?: string }).__coversTestDir = tempRoot;
  });

  afterEach(() => {
    delete (globalThis as { __coversTestDir?: string }).__coversTestDir;
  });

  it("removes other extensions for the same entity id", async () => {
    const { removeStaleEntityCovers } = await import("@/lib/covers/cover-storage");
    const coversDir = path.join(tempRoot, "covers");
    await writeFile(path.join(coversDir, "2.jpeg"), Buffer.from("old"));
    await writeFile(path.join(coversDir, "2.png"), Buffer.from("old-png"));

    await removeStaleEntityCovers("2", ".jpg");

    expect(await fileExists(path.join(coversDir, "2.jpeg"))).toBe(false);
    expect(await fileExists(path.join(coversDir, "2.png"))).toBe(false);
  });

  it("saveEntityCoverBuffer replaces jpeg with jpg and cleans stale files", async () => {
    const { saveEntityCoverBuffer } = await import("@/lib/covers/cover-storage");
    const coversDir = path.join(tempRoot, "covers");
    await writeFile(path.join(coversDir, "franchise-3.jpeg"), Buffer.from("old"));

    const relative = await saveEntityCoverBuffer(
      "franchise-3",
      Buffer.from("new"),
      ".jpg",
    );

    expect(relative).toBe("covers/franchise-3.jpg");
    expect(await fileExists(path.join(coversDir, "franchise-3.jpeg"))).toBe(
      false,
    );
    expect(await fileExists(path.join(coversDir, "franchise-3.jpg"))).toBe(
      true,
    );
  });
});
