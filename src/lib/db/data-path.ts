import path from "path";

/** Resolve a path under `./data` (covers, catalog.db, etc.). */
export function dataPath(...segments: string[]): string {
  return path.join(process.cwd(), "data", ...segments);
}
