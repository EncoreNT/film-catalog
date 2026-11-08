"use client";

import { MediaJobProgressStrip, type MediaJobProgressStripProps } from "@/components/media-jobs/MediaJobProgressStrip";

export function ReleaseMoveProgressStrip(props: MediaJobProgressStripProps) {
  return <MediaJobProgressStrip {...props} kind="move" />;
}
