-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ReleaseBuildTrack" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "buildId" INTEGER NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "kind" TEXT NOT NULL,
    "sourceReleaseId" INTEGER,
    "sourceStreamIndex" INTEGER NOT NULL,
    "sourceFilePath" TEXT NOT NULL,
    "sourceTrackLabel" TEXT,
    "audioMode" TEXT,
    "transcodeCodec" TEXT,
    "transcodeBitrate" INTEGER,
    "channelTarget" TEXT,
    "offsetMs" INTEGER NOT NULL DEFAULT 0,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "forced" BOOLEAN NOT NULL DEFAULT false,
    "keepOriginal" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ReleaseBuildTrack_buildId_fkey" FOREIGN KEY ("buildId") REFERENCES "ReleaseBuild" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ReleaseBuildTrack_sourceReleaseId_fkey" FOREIGN KEY ("sourceReleaseId") REFERENCES "Release" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_ReleaseBuildTrack" ("audioMode", "buildId", "channelTarget", "createdAt", "forced", "id", "isDefault", "kind", "offsetMs", "sortOrder", "sourceFilePath", "sourceReleaseId", "sourceStreamIndex", "sourceTrackLabel", "transcodeBitrate", "transcodeCodec") SELECT "audioMode", "buildId", "channelTarget", "createdAt", "forced", "id", "isDefault", "kind", "offsetMs", "sortOrder", "sourceFilePath", "sourceReleaseId", "sourceStreamIndex", "sourceTrackLabel", "transcodeBitrate", "transcodeCodec" FROM "ReleaseBuildTrack";
DROP TABLE "ReleaseBuildTrack";
ALTER TABLE "new_ReleaseBuildTrack" RENAME TO "ReleaseBuildTrack";
CREATE INDEX "ReleaseBuildTrack_buildId_sortOrder_idx" ON "ReleaseBuildTrack"("buildId", "sortOrder");
CREATE INDEX "ReleaseBuildTrack_sourceReleaseId_idx" ON "ReleaseBuildTrack"("sourceReleaseId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
