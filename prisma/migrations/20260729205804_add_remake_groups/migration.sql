-- CreateTable
CREATE TABLE "RemakeGroup" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "RemakeMember" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "groupId" INTEGER NOT NULL,
    "movieId" INTEGER NOT NULL,
    "role" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RemakeMember_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "RemakeGroup" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RemakeMember_movieId_fkey" FOREIGN KEY ("movieId") REFERENCES "Movie" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "RemakeGroup_slug_key" ON "RemakeGroup"("slug");

-- CreateIndex
CREATE INDEX "RemakeGroup_name_idx" ON "RemakeGroup"("name");

-- CreateIndex
CREATE INDEX "RemakeMember_groupId_idx" ON "RemakeMember"("groupId");

-- CreateIndex
CREATE INDEX "RemakeMember_movieId_idx" ON "RemakeMember"("movieId");

-- CreateIndex
CREATE UNIQUE INDEX "RemakeMember_groupId_movieId_key" ON "RemakeMember"("groupId", "movieId");
