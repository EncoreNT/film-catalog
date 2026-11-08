"use client";

import { MediaJobProgressStrip, type MediaJobProgressStripProps } from "@/components/media-jobs/MediaJobProgressStrip";

export function ReleaseExportProgressStrip(props: MediaJobProgressStripProps) {
  return <MediaJobProgressStrip {...props} kind="export" />;
}
