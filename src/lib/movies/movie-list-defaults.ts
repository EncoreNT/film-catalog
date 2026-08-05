/** Catalog list defaults (safe for client components — no Prisma). */

export const DEFAULT_MOVIE_LIST_LIMIT = 70;

export const DEFAULT_MOVIE_LIST_SORT = "fileDownloadedAt" as const;

export const DEFAULT_MOVIE_LIST_ORDER = "desc" as const;

export type DefaultMovieListSort = typeof DEFAULT_MOVIE_LIST_SORT;

export type DefaultMovieListOrder = typeof DEFAULT_MOVIE_LIST_ORDER;
