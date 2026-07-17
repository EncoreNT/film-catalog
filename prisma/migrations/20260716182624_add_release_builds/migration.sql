-- CreateTable
CREATE TABLE "ReleaseBuild" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "movieId" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'QUEUED',
    "phase" TEXT,
    "progressPercent" REAL,
    "progressMessage" TEXT,
    "errorMessage" TEXT,
    "cancelRequested" BOOLEAN NOT NULL DEFAULT false,
    "heartbeatAt" DATETIME,
    "startedAt" DATETIME,
    "finishedAt" DATETIME,
    "outputPath" TEXT NOT NULL,
    "outputReleaseType" TEXT,
    "outputVersion" TEXT NOT NULL DEFAULT 'theatrical',
    "outputReleaseId" INTEGER,
    "externalStorageId" INTEGER,
    "acknowledgedWarnings" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ReleaseBuild_movieId_fkey" FOREIGN KEY ("movieId") REFERENCES "Movie" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ReleaseBuild_outputReleaseId_fkey" FOREIGN KEY ("outputReleaseId") REFERENCES "Release" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ReleaseBuild_externalStorageId_fkey" FOREIGN KEY ("externalStorageId") REFERENCES "ExternalStorage" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ReleaseBuildSource" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "buildId" INTEGER NOT NULL,
    "releaseId" INTEGER,
    "filePath" TEXT NOT NULL,
    "durationSeconds" REAL,
    "role" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ReleaseBuildSource_buildId_fkey" FOREIGN KEY ("buildId") REFERENCES "ReleaseBuild" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ReleaseBuildSource_releaseId_fkey" FOREIGN KEY ("releaseId") REFERENCES "Release" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ReleaseBuildTrack" (
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
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ReleaseBuildTrack_buildId_fkey" FOREIGN KEY ("buildId") REFERENCES "ReleaseBuild" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ReleaseBuildTrack_sourceReleaseId_fkey" FOREIGN KEY ("sourceReleaseId") REFERENCES "Release" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "ReleaseBuild_movieId_idx" ON "ReleaseBuild"("movieId");

-- CreateIndex
CREATE INDEX "ReleaseBuild_status_idx" ON "ReleaseBuild"("status");

-- CreateIndex
CREATE INDEX "ReleaseBuild_outputPath_idx" ON "ReleaseBuild"("outputPath");

-- CreateIndex
CREATE INDEX "ReleaseBuild_createdAt_idx" ON "ReleaseBuild"("createdAt");

-- CreateIndex
CREATE INDEX "ReleaseBuildSource_buildId_idx" ON "ReleaseBuildSource"("buildId");

-- CreateIndex
CREATE INDEX "ReleaseBuildSource_releaseId_idx" ON "ReleaseBuildSource"("releaseId");

-- CreateIndex
CREATE INDEX "ReleaseBuildTrack_buildId_sortOrder_idx" ON "ReleaseBuildTrack"("buildId", "sortOrder");

-- CreateIndex
CREATE INDEX "ReleaseBuildTrack_sourceReleaseId_idx" ON "ReleaseBuildTrack"("sourceReleaseId");
