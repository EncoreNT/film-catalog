-- AlterTable
ALTER TABLE "ReleaseBuild" ADD COLUMN "queueOrder" INTEGER NOT NULL DEFAULT 0;

-- Backfill from createdAt FIFO (matches legacy worker order)
UPDATE "ReleaseBuild"
SET "queueOrder" = (
  SELECT COUNT(*)
  FROM "ReleaseBuild" AS rb2
  WHERE rb2."createdAt" < "ReleaseBuild"."createdAt"
     OR (rb2."createdAt" = "ReleaseBuild"."createdAt" AND rb2."id" < "ReleaseBuild"."id")
);

-- CreateIndex
CREATE INDEX "ReleaseBuild_status_queueOrder_idx" ON "ReleaseBuild"("status", "queueOrder");
