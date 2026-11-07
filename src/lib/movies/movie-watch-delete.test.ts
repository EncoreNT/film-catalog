import { mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import Database from "better-sqlite3";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "@/generated/prisma/client";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

let directory: string;
let client: PrismaClient;
let deleteMovieWatch: typeof import("./movie-watch").deleteMovieWatch;

// Exercise the domain operation against real SQLite, isolated from the catalog.
vi.mock("@/lib/db/prisma", () => ({ prisma: client }));

beforeAll(async () => {
  directory = mkdtempSync(path.join(tmpdir(), "film-watch-delete-"));
  const file = path.join(directory, "catalog.db");
  const database = new Database(file);
  const migrations = path.join(process.cwd(), "prisma/migrations");
  for (const entry of readdirSync(migrations, { withFileTypes: true }).filter((item) => item.isDirectory()).sort((a, b) => a.name.localeCompare(b.name))) {
    database.exec(readFileSync(path.join(migrations, entry.name, "migration.sql"), "utf8"));
  }
  database.close();
  client = new PrismaClient({ adapter: new PrismaBetterSqlite3({ url: `file:${file}` }) });
  ({ deleteMovieWatch } = await import("./movie-watch"));
});

afterAll(async () => {
  await client?.$disconnect();
  if (directory) rmSync(directory, { recursive: true, force: true });
});

describe("deleteMovieWatch", () => {
  it("keeps another movie's watch when its ID is sent under the wrong movie", async () => {
    const owner = await client.movie.create({ data: { slug: "owner", title: "Owner" } });
    const other = await client.movie.create({ data: { slug: "other", title: "Other" } });
    const watch = await client.movieWatch.create({ data: { movieId: owner.id, watchedOn: new Date("2026-01-01") } });
    await deleteMovieWatch(other.id, watch.id);
    expect(await client.movieWatch.findUnique({ where: { id: watch.id } })).not.toBeNull();
  });

  it("updates the latest day, tolerates retries and preserves ratings after the last watch", async () => {
    const movie = await client.movie.create({ data: { slug: "rewatch", title: "Rewatch" } });
    const rater = await client.rater.create({ data: { name: "Зритель" } });
    await client.movieRating.create({ data: { movieId: movie.id, raterId: rater.id, rating: 7 } });
    const older = await client.movieWatch.create({ data: { movieId: movie.id, watchedOn: new Date("2026-01-01") } });
    const latest = await client.movieWatch.create({ data: { movieId: movie.id, watchedOn: new Date("2026-02-01") } });
    await deleteMovieWatch(movie.id, latest.id);
    await deleteMovieWatch(movie.id, latest.id);
    const remaining = await client.movieWatch.findMany({ where: { movieId: movie.id }, orderBy: { watchedOn: "desc" } });
    expect(remaining.map((row) => row.id)).toEqual([older.id]);
    await deleteMovieWatch(movie.id, older.id);
    expect(await client.movieWatch.count({ where: { movieId: movie.id } })).toBe(0);
    expect(await client.movieRating.count({ where: { movieId: movie.id } })).toBe(1);
    expect(await client.movie.findUnique({ where: { id: movie.id } })).not.toBeNull();
  });
});
