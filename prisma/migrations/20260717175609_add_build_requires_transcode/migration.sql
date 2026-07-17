-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ReleaseBuild" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "movieId" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'QUEUED',
    "phase" TEXT,
    "progressPercent" REAL,
    "progressMessage" TEXT,
    "progressSpeed" REAL,
    "progressOutTimeMs" INTEGER,
    "progressDurationMs" INTEGER,
    "progressStepIndex" INTEGER,
    "progressStepTotal" INTEGER,
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
    "queueOrder" INTEGER NOT NULL DEFAULT 0,
    "requiresTranscode" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ReleaseBuild_movieId_fkey" FOREIGN KEY ("movieId") REFERENCES "Movie" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ReleaseBuild_outputReleaseId_fkey" FOREIGN KEY ("outputReleaseId") REFERENCES "Release" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ReleaseBuild_externalStorageId_fkey" FOREIGN KEY ("externalStorageId") REFERENCES "ExternalStorage" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_ReleaseBuild" ("acknowledgedWarnings", "cancelRequested", "createdAt", "errorMessage", "externalStorageId", "finishedAt", "heartbeatAt", "id", "movieId", "outputPath", "outputReleaseId", "outputReleaseType", "outputVersion", "phase", "progressDurationMs", "progressMessage", "progressOutTimeMs", "progressPercent", "progressSpeed", "progressStepIndex", "progressStepTotal", "queueOrder", "startedAt", "status", "updatedAt") SELECT "acknowledgedWarnings", "cancelRequested", "createdAt", "errorMessage", "externalStorageId", "finishedAt", "heartbeatAt", "id", "movieId", "outputPath", "outputReleaseId", "outputReleaseType", "outputVersion", "phase", "progressDurationMs", "progressMessage", "progressOutTimeMs", "progressPercent", "progressSpeed", "progressStepIndex", "progressStepTotal", "queueOrder", "startedAt", "status", "updatedAt" FROM "ReleaseBuild";
DROP TABLE "ReleaseBuild";
ALTER TABLE "new_ReleaseBuild" RENAME TO "ReleaseBuild";
CREATE INDEX "ReleaseBuild_movieId_idx" ON "ReleaseBuild"("movieId");
CREATE INDEX "ReleaseBuild_status_idx" ON "ReleaseBuild"("status");
CREATE INDEX "ReleaseBuild_status_queueOrder_idx" ON "ReleaseBuild"("status", "queueOrder");
CREATE INDEX "ReleaseBuild_status_requiresTranscode_queueOrder_idx" ON "ReleaseBuild"("status", "requiresTranscode", "queueOrder");
CREATE INDEX "ReleaseBuild_outputPath_idx" ON "ReleaseBuild"("outputPath");
CREATE INDEX "ReleaseBuild_createdAt_idx" ON "ReleaseBuild"("createdAt");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
