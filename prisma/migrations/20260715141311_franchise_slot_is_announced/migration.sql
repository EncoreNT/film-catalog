-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_FranchiseSlot" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "franchiseId" INTEGER NOT NULL,
    "movieId" INTEGER,
    "storyOrder" INTEGER NOT NULL,
    "titleHint" TEXT,
    "yearHint" INTEGER,
    "isAnnounced" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FranchiseSlot_franchiseId_fkey" FOREIGN KEY ("franchiseId") REFERENCES "Franchise" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "FranchiseSlot_movieId_fkey" FOREIGN KEY ("movieId") REFERENCES "Movie" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_FranchiseSlot" ("createdAt", "franchiseId", "id", "movieId", "storyOrder", "titleHint", "yearHint") SELECT "createdAt", "franchiseId", "id", "movieId", "storyOrder", "titleHint", "yearHint" FROM "FranchiseSlot";
DROP TABLE "FranchiseSlot";
ALTER TABLE "new_FranchiseSlot" RENAME TO "FranchiseSlot";
CREATE INDEX "FranchiseSlot_franchiseId_storyOrder_idx" ON "FranchiseSlot"("franchiseId", "storyOrder");
CREATE INDEX "FranchiseSlot_franchiseId_idx" ON "FranchiseSlot"("franchiseId");
CREATE UNIQUE INDEX "FranchiseSlot_franchiseId_movieId_key" ON "FranchiseSlot"("franchiseId", "movieId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
