import path from "node:path";

export function exportPartPath(targetPath: string, jobId: number): string {
  const dir = path.dirname(targetPath);
  const base = path.basename(targetPath);
  return path.join(dir, `.${base}.${jobId}.part`);
}
