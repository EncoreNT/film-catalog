-- Movie/Release split: extract per-file data into a Release table linked to Movie.
-- Each existing Movie row becomes one Movie (work-level) + one Release (file-level).
-- Track tables are re-parented from Movie to Release. Existing duplicates are NOT
-- auto-merged (variant C: manual confirm); they surface on /duplicates for merge.
--
-- The Movie table is rebuilt (SQLite cannot DROP COLUMN that carries an outbound FK
-- via ALTER TABLE), so we use the table-rebuild pattern under PRAGMA foreign_keys=OFF.

-- 1. Create Release table.
CREATE TABLE "Release" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "movieId" INTEGER NOT NULL,
    "storageId" INTEGER,
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
    CONSTRAINT "Release_storageId_fkey" FOREIGN KEY ("storageId") REFERENCES "Storage" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- 2. Backfill Release 1:1 from Movie file-level columns.
INSERT INTO "Release" ("movieId", "storageId", "filePath", "fileSize", "fileMtime", "fileHash", "releaseType", "version", "durationSeconds", "createdAt", "updatedAt")
SELECT "id", "storageId", "filePath", "fileSize", "fileMtime", "fileHash", "releaseType", "version", "durationSeconds", "createdAt", "updatedAt"
FROM "Movie";

CREATE INDEX "Release_movieId_idx" ON "Release"("movieId");
CREATE INDEX "Release_fileHash_idx" ON "Release"("fileHash");
CREATE INDEX "Release_storageId_idx" ON "Release"("storageId");
CREATE INDEX "Release_releaseType_idx" ON "Release"("releaseType");
CREATE INDEX "Release_version_idx" ON "Release"("version");
CREATE INDEX "Release_durationSeconds_idx" ON "Release"("durationSeconds");
CREATE UNIQUE INDEX "Release_filePath_key" ON "Release"("filePath");

-- 3. Rebuild VideoTrack: movieId -> releaseId (1:1 unique, FK -> Release).
CREATE TABLE "new_VideoTrack" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "releaseId" INTEGER NOT NULL,
    "streamIndex" INTEGER NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "resolutionLabel" TEXT,
    "codec" TEXT,
    "hdr" TEXT,
    "fps" TEXT,
    "bitrate" INTEGER,
    CONSTRAINT "VideoTrack_releaseId_fkey" FOREIGN KEY ("releaseId") REFERENCES "Release" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

INSERT INTO "new_VideoTrack" ("id", "releaseId", "streamIndex", "width", "height", "resolutionLabel", "codec", "hdr", "fps", "bitrate")
SELECT v."id", r."id", v."streamIndex", v."width", v."height", v."resolutionLabel", v."codec", v."hdr", v."fps", v."bitrate"
FROM "VideoTrack" v JOIN "Release" r ON r."movieId" = v."movieId";

DROP TABLE "VideoTrack";
ALTER TABLE "new_VideoTrack" RENAME TO "VideoTrack";
CREATE UNIQUE INDEX "VideoTrack_releaseId_key" ON "VideoTrack"("releaseId");
CREATE INDEX "VideoTrack_resolutionLabel_idx" ON "VideoTrack"("resolutionLabel");

-- 4. Rebuild AudioTrack: movieId -> releaseId (FK -> Release).
CREATE TABLE "new_AudioTrack" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "releaseId" INTEGER NOT NULL,
    "streamIndex" INTEGER NOT NULL,
    "codec" TEXT,
    "profile" TEXT,
    "channels" INTEGER,
    "channelLayout" TEXT,
    "bitrate" INTEGER,
    "language" TEXT,
    "title" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "translationType" TEXT,
    CONSTRAINT "AudioTrack_releaseId_fkey" FOREIGN KEY ("releaseId") REFERENCES "Release" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

INSERT INTO "new_AudioTrack" ("id", "releaseId", "streamIndex", "codec", "profile", "channels", "channelLayout", "bitrate", "language", "title", "isDefault", "translationType")
SELECT a."id", r."id", a."streamIndex", a."codec", a."profile", a."channels", a."channelLayout", a."bitrate", a."language", a."title", a."isDefault", a."translationType"
FROM "AudioTrack" a JOIN "Release" r ON r."movieId" = a."movieId";

DROP TABLE "AudioTrack";
ALTER TABLE "new_AudioTrack" RENAME TO "AudioTrack";
CREATE INDEX "AudioTrack_language_idx" ON "AudioTrack"("language");
CREATE INDEX "AudioTrack_channelLayout_idx" ON "AudioTrack"("channelLayout");
CREATE INDEX "AudioTrack_translationType_idx" ON "AudioTrack"("translationType");

-- 5. Rebuild SubtitleTrack: movieId -> releaseId (FK -> Release).
CREATE TABLE "new_SubtitleTrack" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "releaseId" INTEGER NOT NULL,
    "streamIndex" INTEGER NOT NULL,
    "codec" TEXT,
    "codecLabel" TEXT,
    "language" TEXT,
    "title" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "forced" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "SubtitleTrack_releaseId_fkey" FOREIGN KEY ("releaseId") REFERENCES "Release" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

INSERT INTO "new_SubtitleTrack" ("id", "releaseId", "streamIndex", "codec", "codecLabel", "language", "title", "isDefault", "forced")
SELECT s."id", r."id", s."streamIndex", s."codec", s."codecLabel", s."language", s."title", s."isDefault", s."forced"
FROM "SubtitleTrack" s JOIN "Release" r ON r."movieId" = s."movieId";

DROP TABLE "SubtitleTrack";
ALTER TABLE "new_SubtitleTrack" RENAME TO "SubtitleTrack";
CREATE INDEX "SubtitleTrack_language_idx" ON "SubtitleTrack"("language");

-- 6. Rebuild Movie: keep work-level columns, drop file-level columns, add computed matchKey.
--    Done under PRAGMA foreign_keys=OFF so DROP TABLE does not cascade to dependents.
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
    "updatedAt" DATETIME NOT NULL
);

INSERT INTO "new_Movie" ("id", "slug", "title", "year", "description", "matchKey", "status", "coverPath", "rating", "watchedAt", "createdAt", "updatedAt")
SELECT
  "id", "slug", "title", "year", "description",
  trim(replace(replace(replace(replace(replace(replace(replace(
    lower("title"),
  char(9), ' '), char(10), ' '), char(13), ' '), '  ', ' '), '  ', ' '), '  ', ' '), '  ', ' '))
    || '|' || COALESCE(CAST("year" AS TEXT), '') AS "matchKey",
  "status", "coverPath", "rating", "watchedAt", "createdAt", "updatedAt"
FROM "Movie";

DROP TABLE "Movie";
ALTER TABLE "new_Movie" RENAME TO "Movie";

CREATE UNIQUE INDEX "Movie_slug_key" ON "Movie"("slug");
CREATE INDEX "Movie_status_idx" ON "Movie"("status");
CREATE INDEX "Movie_matchKey_idx" ON "Movie"("matchKey");
CREATE INDEX "Movie_rating_idx" ON "Movie"("rating");
CREATE INDEX "Movie_watchedAt_idx" ON "Movie"("watchedAt");

PRAGMA foreign_keys=ON;
