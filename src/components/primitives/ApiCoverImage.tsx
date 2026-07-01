import Image, { type ImageProps } from "next/image";

/**
 * Covers served from /api/covers/... and /api/franchises/.../cover.
 * Skip the Next.js image optimizer — it re-fetches these routes internally
 * and fails on non-image responses (e.g. JSON 404 when the file is missing).
 *
 * Legacy `priority` maps to `loading="eager"` (Next.js 16 prefers explicit
 * loading over the deprecated priority prop for LCP images).
 */
export function ApiCoverImage({
  priority,
  preload,
  loading,
  ...props
}: Omit<ImageProps, "unoptimized">) {
  const resolvedLoading =
    loading ?? (priority || preload ? "eager" : undefined);

  return (
    <Image
      {...props}
      preload={preload}
      loading={resolvedLoading}
      unoptimized
    />
  );
}
