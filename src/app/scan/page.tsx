import { getScanRoot, scanRootDisplay } from "@/lib/db/settings";
import { getDraftQueueStats, getRecentDrafts } from "@/lib/movies/draft-queue";
import { ScanPageClient } from "./ScanPageClient";

export default async function ScanPage() {
  const [scanRoot, stats, drafts] = await Promise.all([
    getScanRoot(),
    getDraftQueueStats(),
    getRecentDrafts(),
  ]);

  return (
    <ScanPageClient
      initialScanRoot={scanRootDisplay(scanRoot) ?? ""}
      initialStats={stats}
      initialDrafts={drafts}
    />
  );
}
