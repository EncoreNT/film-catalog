import { describe, expect, it, vi, beforeAll, afterAll, afterEach } from "vitest";
import { mkdtempSync, readdirSync, readFileSync, rmSync, existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import Database from "better-sqlite3";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "@/generated/prisma/client";
import sharp from "sharp";

let directory: string;
let client: PrismaClient;
let jpeg: Buffer;
let png: Buffer;
let storage: typeof import("./cover-storage");
let cleanup: typeof import("./cleanup-covers").cleanupUnreferencedCovers;
let saveFranchise: typeof import("./save-franchise-cover").saveFranchiseCover;
let deleteMovie: typeof import("@/lib/movies/delete-movie").deleteMovie;
let deleteFranchise: typeof import("@/lib/franchises/delete-franchise").deleteFranchise;
let mergeMovies: typeof import("@/lib/merge/movie-merge").mergeMovies;

vi.mock("@/lib/db/prisma", () => ({ prisma: client }));
vi.mock("@/lib/db/data-path", () => ({ dataPath: (...parts: string[]) => path.join(directory, ...parts) }));

beforeAll(async () => {
  directory = mkdtempSync(path.join(tmpdir(), "cover-lifecycle-"));
  const file = path.join(directory, "catalog.db");
  const database = new Database(file);
  const migrations = path.join(process.cwd(), "prisma/migrations");
  for (const entry of readdirSync(migrations, { withFileTypes: true }).filter((item) => item.isDirectory()).sort((a, b) => a.name.localeCompare(b.name))) {
    database.exec(readFileSync(path.join(migrations, entry.name, "migration.sql"), "utf8"));
  }
  database.close();
  client = new PrismaClient({ adapter: new PrismaBetterSqlite3({ url: `file:${file}` }) });
  await mkdir(path.join(directory, "covers"));
  jpeg = await sharp({ create: { width: 300, height: 450, channels: 3, background: "#8192a3" } }).jpeg().toBuffer();
  png = await sharp({ create: { width: 1200, height: 1800, channels: 3, background: "#8192a3" } }).png().toBuffer();
  storage = await import("./cover-storage");
  ({ cleanupUnreferencedCovers: cleanup } = await import("./cleanup-covers"));
  ({ saveFranchiseCover: saveFranchise } = await import("./save-franchise-cover"));
  ({ deleteMovie } = await import("@/lib/movies/delete-movie"));
  ({ deleteFranchise } = await import("@/lib/franchises/delete-franchise"));
  ({ mergeMovies } = await import("@/lib/merge/movie-merge"));
});
afterEach(async () => {
  await client.movie.deleteMany();
  await client.franchise.deleteMany();
});
afterAll(async () => {
  await client?.$disconnect();
  if (directory) rmSync(directory, { recursive: true, force: true });
});

const exists = (cover: string) => existsSync(path.join(directory, cover));
const movie = (slug: string, coverPath?: string) => client.movie.create({ data: { slug, title: slug, coverPath } });
const franchise = (slug: string, coverPath?: string) => client.franchise.create({ data: { slug, name: slug, coverPath } });
async function index() { return JSON.parse(await readFile(path.join(directory, "covers/poster-metadata.json"), "utf8")); }

describe("cover lifecycle with real isolated SQLite and files", () => {
  it("keeps a shared cover until the final movie or franchise is deleted", async () => {
    const cover = await storage.saveEntityCoverBuffer("shared", jpeg, ".jpg");
    const a = await movie("a", cover);
    const b = await movie("b", cover);
    const f = await franchise("f", cover);
    await deleteMovie(a.id);
    expect(exists(cover)).toBe(true);
    await deleteMovie(b.id);
    expect(exists(cover)).toBe(true);
    await deleteFranchise(f.id);
    expect(exists(cover)).toBe(false);
    expect((await index()).files["shared.jpg"]).toBeUndefined();
  });

  it("replaces franchise JPG with PNG only after updating the DB and cleans metadata", async () => {
    const f = await franchise("replace");
    await saveFranchise(client, f.id, jpeg, ".jpg");
    const next = await saveFranchise(client, f.id, png, ".png");
    expect(next.coverPath).toBe(`covers/franchise-${f.id}.png`);
    expect(exists(`covers/franchise-${f.id}.jpg`)).toBe(false);
    expect(exists(next.coverPath!)).toBe(true);
    const metadata = await index();
    expect(metadata.files[`franchise-${f.id}.jpg`]).toBeUndefined();
    expect(metadata.files[`franchise-${f.id}.png`]).toMatchObject({ width: 1200, height: 1800 });
  });

  it("preserves an old extension still referenced by a movie, including its metadata", async () => {
    const f = await franchise("shared-old-extension");
    const old = await saveFranchise(client, f.id, jpeg, ".jpg");
    const owner = await movie("uses-franchise-cover", old.coverPath!);
    await saveFranchise(client, f.id, png, ".png");
    expect(exists(old.coverPath!)).toBe(true);
    expect((await index()).files[`franchise-${f.id}.jpg`]).toBeDefined();
    await deleteMovie(owner.id);
    expect(exists(old.coverPath!)).toBe(false);
  });

  it("cleans the previous movie path even when it belonged to a merged-away ID", async () => {
    const old = await storage.saveEntityCoverBuffer("old-owner", jpeg, ".jpg");
    const m = await movie("new-owner", old);
    const next = await storage.saveCoverBuffer(m.id, png, ".png");
    expect(exists(old)).toBe(false);
    expect(exists(next)).toBe(true);
  });

  it.each(["canonical", "other"] as const)("merge keeps the %s cover and removes only the unused one", async (choice) => {
    const first = await storage.saveEntityCoverBuffer(`first-${choice}`, jpeg, ".jpg");
    const second = await storage.saveEntityCoverBuffer(`second-${choice}`, png, ".png");
    const a = await movie("merge-a", first);
    const b = await movie("merge-b", second);
    const result = await mergeMovies(a.id, b.id, { coverPath: choice });
    expect(result?.coverPath).toBe(choice === "canonical" ? first : second);
    expect(exists(choice === "canonical" ? first : second)).toBe(true);
    expect(exists(choice === "canonical" ? second : first)).toBe(false);
    expect(await client.movie.findUnique({ where: { id: b.id } })).toBeNull();
  });

  it("adopts the other cover without copying and preserves a discarded cover used by a franchise", async () => {
    const cover = await storage.saveEntityCoverBuffer("adopted", jpeg, ".jpg");
    const a = await movie("empty");
    const b = await movie("has-cover", cover);
    await mergeMovies(a.id, b.id);
    expect((await client.movie.findUniqueOrThrow({ where: { id: a.id } })).coverPath).toBe(cover);
    expect(exists(cover)).toBe(true);
    await franchise("shared-discarded", cover);
    const otherCover = await storage.saveEntityCoverBuffer("replacement", png, ".png");
    const other = await movie("replacement-owner", otherCover);
    await mergeMovies(a.id, other.id, { coverPath: "other" });
    expect(exists(cover)).toBe(true);
  });

  it("does not clean files after a failed merge or before a low-level write is committed", async () => {
    const cover = await storage.saveEntityCoverBuffer("uncommitted", jpeg, ".jpg");
    const a = await movie("kept", cover);
    await expect(mergeMovies(a.id, -1)).rejects.toThrow();
    expect(exists(cover)).toBe(true);
    await storage.saveEntityCoverBuffer("uncommitted", png, ".png");
    expect(exists(cover)).toBe(true);
  });

  it("rejects paths outside covers, tolerates missing files, and preserves referenced stale extensions", async () => {
    const cover = await storage.saveEntityCoverBuffer("protected", jpeg, ".jpg");
    await movie("protected", cover);
    await writeFile(path.join(directory, "outside.jpg"), jpeg);
    await cleanup(["covers/../outside.jpg", "covers/no-such.jpg", cover]);
    await storage.removeStaleEntityCovers("protected", ".png");
    expect(exists("outside.jpg")).toBe(true);
    expect(exists(cover)).toBe(true);
  });

  it("recognizes equivalent paths and clears a franchise cover only after its reference changes", async () => {
    const cover = await storage.saveEntityCoverBuffer("alias", jpeg, ".jpg");
    const f = await franchise("alias-owner", "covers/./alias.jpg");
    await cleanup([cover]);
    expect(exists(cover)).toBe(true);
    const { updateFranchise } = await import("@/lib/franchises/update-franchise");
    await updateFranchise(f.id, { coverPath: null });
    expect(exists(cover)).toBe(false);
  });

  it("keeps the old cover and removes the newly written orphan if saving the DB reference fails", async () => {
    const f = await franchise("failed-save");
    const old = await saveFranchise(client, f.id, jpeg, ".jpg");
    const update = vi.spyOn(client.franchise, "update").mockRejectedValueOnce(new Error("write failed"));
    try { await expect(saveFranchise(client, f.id, png, ".png")).rejects.toThrow("write failed"); }
    finally { update.mockRestore(); }
    expect(exists(old.coverPath!)).toBe(true);
    expect(exists(`covers/franchise-${f.id}.png`)).toBe(false);
  });

  it("serializes concurrent replacements so cleanup cannot remove a file awaiting its DB update", async () => {
    const f = await franchise("concurrent");
    await Promise.all([
      saveFranchise(client, f.id, jpeg, ".jpg"),
      saveFranchise(client, f.id, png, ".png"),
    ]);
    const final = await client.franchise.findUniqueOrThrow({ where: { id: f.id } });
    expect(exists(final.coverPath!)).toBe(true);
    const files = readdirSync(path.join(directory, "covers")).filter((name) => name.startsWith(`franchise-${f.id}.`));
    expect(files).toEqual([path.basename(final.coverPath!)]);
  });
});
