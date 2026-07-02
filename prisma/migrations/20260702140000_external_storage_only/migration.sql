-- External storage only: Storage (LOCAL|EXTERNAL) → ExternalStorage.
-- Release.storageId → externalStorageId; null means local disk (no DB row).

PRAGMA foreign_keys=OFF;

-- 1. External drives (preserve ids for existing release links).
CREATE TABLE "ExternalStorage" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "path" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX "ExternalStorage_name_key" ON "ExternalStorage"("name");

INSERT INTO "ExternalStorage" ("id", "name", "path", "createdAt")
SELECT "id", "name", "path", "createdAt"
FROM "Storage"
WHERE "type" = 'EXTERNAL';

-- 2. Rebuild Release: drop LOCAL storage links, rename FK column.
CREATE TABLE "new_Release" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "movieId" INTEGER NOT NULL,
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
    CONSTRAINT "Release_externalStorageId_fkey" FOREIGN KEY ("externalStorageId") REFERENCES "ExternalStorage" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

INSERT INTO "new_Release" (
    "id", "movieId", "externalStorageId", "filePath", "fileSize", "fileMtime", "fileHash",
    "releaseType", "version", "durationSeconds", "createdAt", "updatedAt"
)
SELECT
    r."id",
    r."movieId",
    CASE
        WHEN r."storageId" IS NULL THEN NULL
        WHEN s."type" = 'EXTERNAL' THEN r."storageId"
        ELSE NULL
    END,
    r."filePath",
    r."fileSize",
    r."fileMtime",
    r."fileHash",
    r."releaseType",
    r."version",
    r."durationSeconds",
    r."createdAt",
    r."updatedAt"
FROM "Release" r
LEFT JOIN "Storage" s ON s."id" = r."storageId";

DROP TABLE "Release";
ALTER TABLE "new_Release" RENAME TO "Release";

CREATE UNIQUE INDEX "Release_filePath_key" ON "Release"("filePath");
CREATE INDEX "Release_movieId_idx" ON "Release"("movieId");
CREATE INDEX "Release_fileHash_idx" ON "Release"("fileHash");
CREATE INDEX "Release_externalStorageId_idx" ON "Release"("externalStorageId");
CREATE INDEX "Release_releaseType_idx" ON "Release"("releaseType");
CREATE INDEX "Release_version_idx" ON "Release"("version");
CREATE INDEX "Release_durationSeconds_idx" ON "Release"("durationSeconds");

DROP TABLE "Storage";

PRAGMA foreign_keys=ON;
