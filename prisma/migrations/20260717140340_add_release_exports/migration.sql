-- CreateTable
CREATE TABLE "ReleaseExport" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "movieId" INTEGER NOT NULL,
    "releaseId" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'QUEUED',
    "phase" TEXT,
    "progressPercent" REAL,
    "progressMessage" TEXT,
    "progressSpeed" REAL,
    "sourceFilePath" TEXT NOT NULL,
    "sourceFileSize" INTEGER,
    "targetPath" TEXT NOT NULL,
    "targetFilename" TEXT NOT NULL,
    "errorMessage" TEXT,
    "cancelRequested" BOOLEAN NOT NULL DEFAULT false,
    "heartbeatAt" DATETIME,
    "startedAt" DATETIME,
    "finishedAt" DATETIME,
    "queueOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ReleaseExport_movieId_fkey" FOREIGN KEY ("movieId") REFERENCES "Movie" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ReleaseExport_releaseId_fkey" FOREIGN KEY ("releaseId") REFERENCES "Release" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "ReleaseExport_movieId_idx" ON "ReleaseExport"("movieId");

-- CreateIndex
CREATE INDEX "ReleaseExport_releaseId_idx" ON "ReleaseExport"("releaseId");

-- CreateIndex
CREATE INDEX "ReleaseExport_status_idx" ON "ReleaseExport"("status");

-- CreateIndex
CREATE INDEX "ReleaseExport_status_queueOrder_idx" ON "ReleaseExport"("status", "queueOrder");

-- CreateIndex
CREATE INDEX "ReleaseExport_createdAt_idx" ON "ReleaseExport"("createdAt");
