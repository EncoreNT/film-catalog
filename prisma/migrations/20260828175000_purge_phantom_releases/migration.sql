-- Phantom releases: no file on disk. Keep Movie rows.
-- ReleaseExport/ReleaseMove Restrict delete; null FKs that SetNull.

PRAGMA foreign_keys=ON;

UPDATE "Movie"
SET "primaryReleaseId" = NULL
WHERE "primaryReleaseId" IN (
  SELECT "id" FROM "Release"
  WHERE "filePath" IS NULL OR TRIM("filePath") = ''
);

DELETE FROM "ReleaseExport"
WHERE "releaseId" IN (
  SELECT "id" FROM "Release"
  WHERE "filePath" IS NULL OR TRIM("filePath") = ''
);

DELETE FROM "ReleaseMove"
WHERE "releaseId" IN (
  SELECT "id" FROM "Release"
  WHERE "filePath" IS NULL OR TRIM("filePath") = ''
);

UPDATE "ReleaseBuild"
SET "outputReleaseId" = NULL
WHERE "outputReleaseId" IN (
  SELECT "id" FROM "Release"
  WHERE "filePath" IS NULL OR TRIM("filePath") = ''
);

UPDATE "ReleaseBuildSource"
SET "releaseId" = NULL
WHERE "releaseId" IN (
  SELECT "id" FROM "Release"
  WHERE "filePath" IS NULL OR TRIM("filePath") = ''
);

UPDATE "ReleaseBuildTrack"
SET "sourceReleaseId" = NULL
WHERE "sourceReleaseId" IN (
  SELECT "id" FROM "Release"
  WHERE "filePath" IS NULL OR TRIM("filePath") = ''
);

DELETE FROM "Release"
WHERE "filePath" IS NULL OR TRIM("filePath") = '';
