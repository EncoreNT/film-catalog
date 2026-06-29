import Image, { type ImageProps } from "next/image";

/**
 * Covers served from /api/covers/... and /api/franchises/.../cover.
 * Skip the Next.js image optimizer — it re-fetches these routes internally
 * and fails on non-image responses (e.g. JSON 404 when the file is missing).
 */
export function ApiCoverImage(props: Omit<ImageProps, "unoptimized">) {
  return <Image {...props} unoptimized />;
}
