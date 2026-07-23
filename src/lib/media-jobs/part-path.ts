import path from "node:path";

/** Atomic copy target: hidden `.basename.jobId.part` beside final path. */
export function mediaJobPartPath(targetPath: string, jobId: number): string {
  const dir = path.dirname(targetPath);
  const base = path.basename(targetPath);
  return path.join(dir, `.${base}.${jobId}.part`);
}
