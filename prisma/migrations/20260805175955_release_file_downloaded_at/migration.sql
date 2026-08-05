-- AlterTable
ALTER TABLE "Release" ADD COLUMN "fileDownloadedAt" DATETIME;

-- Backfill from mtime for existing rows
UPDATE "Release" SET "fileDownloadedAt" = "fileMtime" WHERE "fileMtime" IS NOT NULL;
