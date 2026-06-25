-- CreateTable
CREATE TABLE "Storage" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'LOCAL',
    "path" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Movie" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "title" TEXT NOT NULL,
    "year" INTEGER,
    "description" TEXT,
    "filePath" TEXT,
    "fileSize" INTEGER,
    "fileMtime" DATETIME,
    "fileHash" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "coverPath" TEXT,
    "rating" INTEGER,
    "watchedAt" DATETIME,
    "storageId" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Movie_storageId_fkey" FOREIGN KEY ("storageId") REFERENCES "Storage" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Movie" ("coverPath", "createdAt", "description", "fileHash", "fileMtime", "filePath", "fileSize", "id", "rating", "status", "title", "updatedAt", "watchedAt", "year") SELECT "coverPath", "createdAt", "description", "fileHash", "fileMtime", "filePath", "fileSize", "id", "rating", "status", "title", "updatedAt", "watchedAt", "year" FROM "Movie";
DROP TABLE "Movie";
ALTER TABLE "new_Movie" RENAME TO "Movie";
CREATE INDEX "Movie_status_idx" ON "Movie"("status");
CREATE INDEX "Movie_fileHash_idx" ON "Movie"("fileHash");
CREATE INDEX "Movie_rating_idx" ON "Movie"("rating");
CREATE INDEX "Movie_watchedAt_idx" ON "Movie"("watchedAt");
CREATE INDEX "Movie_storageId_idx" ON "Movie"("storageId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "Storage_name_key" ON "Storage"("name");

-- CreateIndex
CREATE INDEX "Storage_type_idx" ON "Storage"("type");
