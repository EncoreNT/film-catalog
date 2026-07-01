-- AlterTable
-- Adds the "version" column (the cut of the film: theatrical, director's cut, …).
-- NOT NULL with DEFAULT 'theatrical' so every existing row is backfilled to the
-- base theatrical version, and any new movie without an explicit value gets it too.
ALTER TABLE "Movie" ADD COLUMN "version" TEXT NOT NULL DEFAULT 'theatrical';

-- CreateIndex
CREATE INDEX "Movie_version_idx" ON "Movie"("version");
