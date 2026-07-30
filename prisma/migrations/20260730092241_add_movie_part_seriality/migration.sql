-- AlterTable
ALTER TABLE "Movie" ADD COLUMN "partCount" INTEGER;

-- CreateTable
CREATE TABLE "MoviePart" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "movieId" INTEGER NOT NULL,
    "partNumber" INTEGER NOT NULL,
    "title" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "MoviePart_movieId_fkey" FOREIGN KEY ("movieId") REFERENCES "Movie" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Release" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "movieId" INTEGER NOT NULL,
    "moviePartId" INTEGER,
    "externalStorageId" INTEGER,
    "filePath" TEXT,
    "fileSize" INTEGER,
    "fileMtime" DATETIME,
    "fileHash" TEXT,
    "releaseType" TEXT,
    "version" TEXT NOT NULL DEFAULT 'theatrical',
    "durationSeconds" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Release_movieId_fkey" FOREIGN KEY ("movieId") REFERENCES "Movie" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Release_moviePartId_fkey" FOREIGN KEY ("moviePartId") REFERENCES "MoviePart" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Release_externalStorageId_fkey" FOREIGN KEY ("externalStorageId") REFERENCES "ExternalStorage" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Release" ("createdAt", "durationSeconds", "externalStorageId", "fileHash", "fileMtime", "filePath", "fileSize", "id", "movieId", "releaseType", "updatedAt", "version") SELECT "createdAt", "durationSeconds", "externalStorageId", "fileHash", "fileMtime", "filePath", "fileSize", "id", "movieId", "releaseType", "updatedAt", "version" FROM "Release";
DROP TABLE "Release";
ALTER TABLE "new_Release" RENAME TO "Release";
CREATE UNIQUE INDEX "Release_filePath_key" ON "Release"("filePath");
CREATE INDEX "Release_movieId_idx" ON "Release"("movieId");
CREATE INDEX "Release_moviePartId_idx" ON "Release"("moviePartId");
CREATE INDEX "Release_fileHash_idx" ON "Release"("fileHash");
CREATE INDEX "Release_externalStorageId_idx" ON "Release"("externalStorageId");
CREATE INDEX "Release_releaseType_idx" ON "Release"("releaseType");
CREATE INDEX "Release_version_idx" ON "Release"("version");
CREATE INDEX "Release_durationSeconds_idx" ON "Release"("durationSeconds");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "MoviePart_movieId_partNumber_idx" ON "MoviePart"("movieId", "partNumber");

-- CreateIndex
CREATE UNIQUE INDEX "MoviePart_movieId_partNumber_key" ON "MoviePart"("movieId", "partNumber");
