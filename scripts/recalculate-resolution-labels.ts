/**
 * Recompute VideoTrack.resolutionLabel from stored width/height (no ffprobe).
 * Run after changing getResolutionLabel tolerance: npx tsx scripts/recalculate-resolution-labels.ts
 */
import { prisma } from "@/lib/db/prisma";
import { getResolutionLabel } from "@/lib/shared/resolution";

async function main() {
  const tracks = await prisma.videoTrack.findMany({
    select: { id: true, width: true, height: true, resolutionLabel: true },
  });

  let updated = 0;
  for (const track of tracks) {
    const next = getResolutionLabel(track.width, track.height);
    if (track.resolutionLabel === next) continue;
    await prisma.videoTrack.update({
      where: { id: track.id },
      data: { resolutionLabel: next },
    });
    updated++;
    console.log(
      `${track.id}: ${track.resolutionLabel ?? "null"} → ${next} (${track.width}×${track.height})`,
    );
  }

  console.log(`Done. Updated ${updated} of ${tracks.length} video tracks.`);
}

main().finally(() => prisma.$disconnect());
