-- Replace implicit Movie↔Genre join with an explicit table that stores sort order.

CREATE TABLE "MovieGenre" (
    "movieId" INTEGER NOT NULL,
    "genreId" INTEGER NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "MovieGenre_movieId_fkey" FOREIGN KEY ("movieId") REFERENCES "Movie" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MovieGenre_genreId_fkey" FOREIGN KEY ("genreId") REFERENCES "Genre" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    PRIMARY KEY ("movieId", "genreId")
);

-- Preserve existing links; initial order matches the old alphabetical display.
INSERT INTO "MovieGenre" ("movieId", "genreId", "sortOrder")
SELECT
    j."B" AS "movieId",
    j."A" AS "genreId",
    (ROW_NUMBER() OVER (PARTITION BY j."B" ORDER BY g."name" ASC) - 1) AS "sortOrder"
FROM "_GenreToMovie" j
JOIN "Genre" g ON g."id" = j."A";

DROP TABLE "_GenreToMovie";

CREATE INDEX "MovieGenre_movieId_sortOrder_idx" ON "MovieGenre"("movieId", "sortOrder");
