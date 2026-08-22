-- AlterTable
ALTER TABLE "VideoTrack" ADD COLUMN "hasHdr10Plus" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "VideoTrack_hasHdr10Plus_idx" ON "VideoTrack"("hasHdr10Plus");
