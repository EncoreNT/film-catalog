-- AlterTable
ALTER TABLE "AudioTrack" ADD COLUMN "translationType" TEXT;

-- AlterTable
ALTER TABLE "Movie" ADD COLUMN "releaseType" TEXT;

-- CreateIndex
CREATE INDEX "AudioTrack_translationType_idx" ON "AudioTrack"("translationType");

-- CreateIndex
CREATE INDEX "Movie_releaseType_idx" ON "Movie"("releaseType");
