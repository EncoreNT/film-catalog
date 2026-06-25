-- CreateTable
CREATE TABLE "Movie" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "title" TEXT NOT NULL,
    "year" INTEGER,
    "description" TEXT,
    "filePath" TEXT NOT NULL,
    "fileSize" INTEGER,
    "fileMtime" DATETIME,
    "fileHash" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "coverPath" TEXT,
    "rating" INTEGER,
    "watchedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "VideoTrack" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "movieId" INTEGER NOT NULL,
    "streamIndex" INTEGER NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "resolutionLabel" TEXT,
    "codec" TEXT,
    "hdr" TEXT,
    "fps" TEXT,
    "bitrate" INTEGER,
    CONSTRAINT "VideoTrack_movieId_fkey" FOREIGN KEY ("movieId") REFERENCES "Movie" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AudioTrack" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "movieId" INTEGER NOT NULL,
    "streamIndex" INTEGER NOT NULL,
    "codec" TEXT,
    "profile" TEXT,
    "channels" INTEGER,
    "channelLayout" TEXT,
    "bitrate" INTEGER,
    "language" TEXT,
    "title" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "AudioTrack_movieId_fkey" FOREIGN KEY ("movieId") REFERENCES "Movie" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SubtitleTrack" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "movieId" INTEGER NOT NULL,
    "streamIndex" INTEGER NOT NULL,
    "codec" TEXT,
    "codecLabel" TEXT,
    "language" TEXT,
    "title" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "forced" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "SubtitleTrack_movieId_fkey" FOREIGN KEY ("movieId") REFERENCES "Movie" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Setting" (
    "key" TEXT NOT NULL PRIMARY KEY,
    "value" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "Movie_filePath_key" ON "Movie"("filePath");

-- CreateIndex
CREATE INDEX "Movie_status_idx" ON "Movie"("status");

-- CreateIndex
CREATE INDEX "Movie_fileHash_idx" ON "Movie"("fileHash");

-- CreateIndex
CREATE INDEX "Movie_rating_idx" ON "Movie"("rating");

-- CreateIndex
CREATE INDEX "Movie_watchedAt_idx" ON "Movie"("watchedAt");

-- CreateIndex
CREATE UNIQUE INDEX "VideoTrack_movieId_key" ON "VideoTrack"("movieId");

-- CreateIndex
CREATE INDEX "VideoTrack_resolutionLabel_idx" ON "VideoTrack"("resolutionLabel");

-- CreateIndex
CREATE INDEX "AudioTrack_language_idx" ON "AudioTrack"("language");

-- CreateIndex
CREATE INDEX "AudioTrack_channelLayout_idx" ON "AudioTrack"("channelLayout");

-- CreateIndex
CREATE INDEX "SubtitleTrack_language_idx" ON "SubtitleTrack"("language");
