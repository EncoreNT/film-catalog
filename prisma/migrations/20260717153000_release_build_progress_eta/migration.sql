-- AlterTable
ALTER TABLE "ReleaseBuild" ADD COLUMN "progressSpeed" REAL;
ALTER TABLE "ReleaseBuild" ADD COLUMN "progressOutTimeMs" INTEGER;
ALTER TABLE "ReleaseBuild" ADD COLUMN "progressDurationMs" INTEGER;
ALTER TABLE "ReleaseBuild" ADD COLUMN "progressStepIndex" INTEGER;
ALTER TABLE "ReleaseBuild" ADD COLUMN "progressStepTotal" INTEGER;
