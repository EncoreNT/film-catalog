# ADR-0015: Multi-rater model

- **Status:** Accepted
- **Date:** 2026-08-16

## Context

Личный каталог фильмов должен поддерживать нескольких оценщиков (например «Я» и «Жена»). Раньше `Movie.rating` хранил одну оценку на фильм.

Варианты хранения средней оценки:

1. **Денормализация** — `Movie.rating` как среднее, пересчитывается при каждом upsert `MovieRating`.
2. **Compute on read** — средняя считается из `MovieRating` rows при отображении и в sort/filter pipeline.

Выбран compute on read: single source of truth, нет риска рассинхрона денормализованного поля.

Sort/filter по rating и minRating требуют двухшагового pipeline (как release-aggregate sort для duration/fileSize).

## Decision

- Модели `Rater` (имя, sortOrder) и `MovieRating` (movieId, raterId, rating) с `@@unique([movieId, raterId])`.
- Поле `Movie.rating` удалено.
- `Movie.watchedAt` остаётся на уровне фильма (независимо от per-rater оценок). Просмотрен = есть `watchedAt` **или** хотя бы одна оценка; простановка оценки **не** меняет `watchedAt` автоматически.
- Sort/filter: `fetchMovieList` → ветка `isRatingSortOrFilter` → загрузка candidates + avg в JS + slice (модуль `movie-rating-sort.ts`).
- API: `/api/raters` (CRUD + reorder), `/api/movies/[id]/ratings` (PUT/DELETE), `/api/settings` (catalog/builds/export paths).
- UI: `/settings` с табами; карточка фильма и каталог показывают per-rater оценки + среднюю.
- Merge: `MovieRating` rows переносятся с other на canonical; при конфликте по raterId побеждает canonical.

Миграция: default raters «Я» и «Она»; существующий `Movie.rating` дублируется на обоих.

## Consequences

**Плюсы:** нет денормализации avg; гибкий список оценщиков; настройки catalog/builds в `Setting`.

**Минусы:** sort/filter по rating загружает candidates в память (приемлемо для pet-project); merge не даёт выбрать чужие per-rater оценки — canonical wins по raterId.

**Связанные модули:** `lib/raters/*`, `lib/movies/movie-rating*.ts`, `lib/db/settings.ts`, `components/settings/*`.
