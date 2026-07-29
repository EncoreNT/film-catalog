-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Movie" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "year" INTEGER,
    "description" TEXT,
    "matchKey" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "coverPath" TEXT,
    "rating" INTEGER,
    "watchedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "primaryReleaseId" INTEGER,
    CONSTRAINT "Movie_primaryReleaseId_fkey" FOREIGN KEY ("primaryReleaseId") REFERENCES "Release" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Movie" ("coverPath", "createdAt", "description", "id", "matchKey", "rating", "slug", "status", "title", "updatedAt", "watchedAt", "year") SELECT "coverPath", "createdAt", "description", "id", "matchKey", "rating", "slug", "status", "title", "updatedAt", "watchedAt", "year" FROM "Movie";
DROP TABLE "Movie";
ALTER TABLE "new_Movie" RENAME TO "Movie";
CREATE UNIQUE INDEX "Movie_slug_key" ON "Movie"("slug");
CREATE INDEX "Movie_status_idx" ON "Movie"("status");
CREATE INDEX "Movie_matchKey_idx" ON "Movie"("matchKey");
CREATE INDEX "Movie_rating_idx" ON "Movie"("rating");
CREATE INDEX "Movie_watchedAt_idx" ON "Movie"("watchedAt");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
