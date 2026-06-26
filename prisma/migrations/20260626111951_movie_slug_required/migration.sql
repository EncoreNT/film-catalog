/*
  Warnings:

  - Made the column `slug` on table `Movie` required. This step will fail if there are existing NULL values in that column.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Movie" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "year" INTEGER,
    "description" TEXT,
    "durationSeconds" INTEGER,
    "filePath" TEXT,
    "fileSize" INTEGER,
    "fileMtime" DATETIME,
    "fileHash" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "coverPath" TEXT,
    "rating" INTEGER,
    "watchedAt" DATETIME,
    "storageId" INTEGER,
    "releaseType" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Movie_storageId_fkey" FOREIGN KEY ("storageId") REFERENCES "Storage" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Movie" ("coverPath", "createdAt", "description", "durationSeconds", "fileHash", "fileMtime", "filePath", "fileSize", "id", "rating", "releaseType", "slug", "status", "storageId", "title", "updatedAt", "watchedAt", "year") SELECT "coverPath", "createdAt", "description", "durationSeconds", "fileHash", "fileMtime", "filePath", "fileSize", "id", "rating", "releaseType", "slug", "status", "storageId", "title", "updatedAt", "watchedAt", "year" FROM "Movie";
DROP TABLE "Movie";
ALTER TABLE "new_Movie" RENAME TO "Movie";
CREATE UNIQUE INDEX "Movie_slug_key" ON "Movie"("slug");
CREATE INDEX "Movie_status_idx" ON "Movie"("status");
CREATE INDEX "Movie_fileHash_idx" ON "Movie"("fileHash");
CREATE INDEX "Movie_rating_idx" ON "Movie"("rating");
CREATE INDEX "Movie_watchedAt_idx" ON "Movie"("watchedAt");
CREATE INDEX "Movie_storageId_idx" ON "Movie"("storageId");
CREATE INDEX "Movie_releaseType_idx" ON "Movie"("releaseType");
CREATE INDEX "Movie_durationSeconds_idx" ON "Movie"("durationSeconds");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
