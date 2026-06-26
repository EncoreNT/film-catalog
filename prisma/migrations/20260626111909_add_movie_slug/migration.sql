-- AlterTable
ALTER TABLE "Movie" ADD COLUMN "slug" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Movie_slug_key" ON "Movie"("slug");
