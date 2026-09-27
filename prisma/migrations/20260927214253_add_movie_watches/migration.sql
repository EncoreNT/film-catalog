-- CreateTable
CREATE TABLE "MovieWatch" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "movieId" INTEGER NOT NULL,
    "watchedOn" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MovieWatch_movieId_fkey" FOREIGN KEY ("movieId") REFERENCES "Movie" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "MovieWatch_movieId_idx" ON "MovieWatch"("movieId");

-- CreateIndex
CREATE UNIQUE INDEX "MovieWatch_movieId_watchedOn_key" ON "MovieWatch"("movieId", "watchedOn");

-- Existing single dates become the first journal day (UTC midnight, Prisma iso8601).
INSERT INTO "MovieWatch" ("movieId", "watchedOn")
SELECT
    "id",
    strftime('%Y-%m-%dT00:00:00.000+00:00', "watchedAt")
FROM "Movie"
WHERE "watchedAt" IS NOT NULL;
