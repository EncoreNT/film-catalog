-- CreateTable
CREATE TABLE "ReleaseMove" (
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
    "externalStorageId" INTEGER,
    "errorMessage" TEXT,
    "warningMessage" TEXT,
    "cancelRequested" BOOLEAN NOT NULL DEFAULT false,
    "heartbeatAt" DATETIME,
    "startedAt" DATETIME,
    "finishedAt" DATETIME,
    "queueOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ReleaseMove_movieId_fkey" FOREIGN KEY ("movieId") REFERENCES "Movie" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ReleaseMove_releaseId_fkey" FOREIGN KEY ("releaseId") REFERENCES "Release" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ReleaseMove_externalStorageId_fkey" FOREIGN KEY ("externalStorageId") REFERENCES "ExternalStorage" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "ReleaseMove_movieId_idx" ON "ReleaseMove"("movieId");

-- CreateIndex
CREATE INDEX "ReleaseMove_releaseId_idx" ON "ReleaseMove"("releaseId");

-- CreateIndex
CREATE INDEX "ReleaseMove_status_idx" ON "ReleaseMove"("status");

-- CreateIndex
CREATE INDEX "ReleaseMove_status_queueOrder_idx" ON "ReleaseMove"("status", "queueOrder");

-- CreateIndex
CREATE INDEX "ReleaseMove_createdAt_idx" ON "ReleaseMove"("createdAt");
