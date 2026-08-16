-- CreateTable
CREATE TABLE "Rater" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "MovieRating" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "movieId" INTEGER NOT NULL,
    "raterId" INTEGER NOT NULL,
    "rating" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "MovieRating_movieId_fkey" FOREIGN KEY ("movieId") REFERENCES "Movie" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MovieRating_raterId_fkey" FOREIGN KEY ("raterId") REFERENCES "Rater" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Default raters
INSERT INTO "Rater" ("name", "sortOrder", "createdAt", "updatedAt") VALUES ('Я', 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
INSERT INTO "Rater" ("name", "sortOrder", "createdAt", "updatedAt") VALUES ('Она', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Migrate existing Movie.rating to per-rater rows (duplicate for both raters)
INSERT INTO "MovieRating" ("movieId", "raterId", "rating", "createdAt", "updatedAt")
SELECT "id", 1, "rating", CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "Movie"
WHERE "rating" IS NOT NULL;

INSERT INTO "MovieRating" ("movieId", "raterId", "rating", "createdAt", "updatedAt")
SELECT "id", 2, "rating", CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "Movie"
WHERE "rating" IS NOT NULL;

-- Redefine Movie without rating column
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
    "watchedAt" DATETIME,
    "partCount" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "primaryReleaseId" INTEGER,
    CONSTRAINT "Movie_primaryReleaseId_fkey" FOREIGN KEY ("primaryReleaseId") REFERENCES "Release" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Movie" ("coverPath", "createdAt", "description", "id", "matchKey", "partCount", "primaryReleaseId", "slug", "status", "title", "updatedAt", "watchedAt", "year") SELECT "coverPath", "createdAt", "description", "id", "matchKey", "partCount", "primaryReleaseId", "slug", "status", "title", "updatedAt", "watchedAt", "year" FROM "Movie";
DROP TABLE "Movie";
ALTER TABLE "new_Movie" RENAME TO "Movie";
CREATE UNIQUE INDEX "Movie_slug_key" ON "Movie"("slug");
CREATE INDEX "Movie_status_idx" ON "Movie"("status");
CREATE INDEX "Movie_matchKey_idx" ON "Movie"("matchKey");
CREATE INDEX "Movie_watchedAt_idx" ON "Movie"("watchedAt");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "Rater_sortOrder_idx" ON "Rater"("sortOrder");

-- CreateIndex
CREATE INDEX "MovieRating_movieId_idx" ON "MovieRating"("movieId");

-- CreateIndex
CREATE INDEX "MovieRating_raterId_idx" ON "MovieRating"("raterId");

-- CreateIndex
CREATE UNIQUE INDEX "MovieRating_movieId_raterId_key" ON "MovieRating"("movieId", "raterId");
