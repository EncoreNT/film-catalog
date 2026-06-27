-- CreateTable
CREATE TABLE "Franchise" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "coverPath" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "FranchiseSlot" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "franchiseId" INTEGER NOT NULL,
    "movieId" INTEGER,
    "storyOrder" INTEGER NOT NULL,
    "titleHint" TEXT,
    "yearHint" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FranchiseSlot_franchiseId_fkey" FOREIGN KEY ("franchiseId") REFERENCES "Franchise" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "FranchiseSlot_movieId_fkey" FOREIGN KEY ("movieId") REFERENCES "Movie" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Franchise_slug_key" ON "Franchise"("slug");

-- CreateIndex
CREATE INDEX "Franchise_name_idx" ON "Franchise"("name");

-- CreateIndex
CREATE INDEX "FranchiseSlot_franchiseId_storyOrder_idx" ON "FranchiseSlot"("franchiseId", "storyOrder");

-- CreateIndex
CREATE INDEX "FranchiseSlot_franchiseId_idx" ON "FranchiseSlot"("franchiseId");

-- CreateIndex
CREATE UNIQUE INDEX "FranchiseSlot_franchiseId_movieId_key" ON "FranchiseSlot"("franchiseId", "movieId");
