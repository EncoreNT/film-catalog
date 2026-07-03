# ADR-0003: Domain layout for `lib/` and `components/`

## Status

Accepted

## Context

К концу 2026 Q2 каталог вырос до ~60 файлов в плоском `src/lib/` и ~42 в корне `src/components/`. Это создавало проблемы:

- Сложно ориентироваться AI и людям без полного grep по каталогу.
- Дублирование: cover upload (movie vs franchise), empty states, probe-from-file, cover serve/upload в route handlers, `ReleaseWithTracks` в двух местах, `formatDuration` с коллизией имён.
- Нарушение слоёв: `lib/spec-tags.ts` импортировал `SpecTagKind` из `components/`; `useStoragePicker` — типы из `StoragePicker`.
- Route handlers и страницы содержали бизнес-логику и крупные JSX-блоки вместо тонкого orchestration-слоя.
- Мёртвый код: deprecated wrappers, неиспользуемые API (`GET/PUT /api/scan`, `GET /api/duplicates`), unwired script `backfill-movie-slugs`.

Рассматривались варианты:

1. **Re-export shims** на старых путях (`lib/foo.ts` → `export * from './movies/foo'`) — нулевой риск для импортов, но долго тащит два пути.
2. **Чистый разрыв** — codemod + переписывание всех `@/lib/*` и `@/components/*` за один проход; typecheck ловит пропуски.

Выбран вариант 2.

## Decision

### `src/lib/` — доменные подкаталоги

| Подкаталог | Содержимое |
|------------|------------|
| `db/` | prisma, settings, data-path |
| `api/` | api-utils, validators, ndjson-stream |
| `shared/` | slug, format, duration, dictionaries, text-trim, storage-types, … |
| `media/` | scanner, ffprobe, spec-tags, probe-from-file |
| `covers/` | cover-storage, serve/save/fetch/parse upload helpers |
| `movies/` | movie-include, movie-query, create-movie, load-movie-by-slug, … |
| `releases/` | release-api, release-primary, resolve-active-release, … |
| `catalog/` | catalog-facets, archive-metrics, archive-quality-metrics |
| `franchises/` | franchise-slots, attach-movie, load-franchise-by-slug, … |
| `merge/` | movie-merge, merge-preview, alternative-quality |

Импорты: `@/lib/<domain>/<module>`. Тесты co-located: `lib/<domain>/*.test.ts`.

Типы `MovieWithTracks` / `ReleaseWithTracks` — единый источник в `movies/movie-include.ts`.

### `src/components/` — доменные подкаталоги

| Подкаталог | Содержимое |
|------------|------------|
| `primitives/` | Button, Field, ImageCoverUpload, EmptyState, BackLink, QualityGauge, … |
| `layout/` | AmbientBackground, ErrorScene (+ ErrorSceneFrame), EditPageHeader |
| `catalog/` | MovieCatalog, FilterBar, EmptyCatalog, CatalogSkeleton |
| `movies/` | MovieCard, MovieForm, MovieDetailHeader, … |
| `releases/` | ReleaseEditor, MovieReleasePanel, … |
| `franchises/` | FranchiseForm, FranchiseDetailHero, … |
| `scan/` | ScanProgressModal, DraftQueueGrid, … |
| `duplicates/` | DuplicateGroupList, … |
| `shared/` | StoragePicker, TrackEditorSection, SpecTag (presentational) |

Domain-only типы (`SpecTagKind`, `StorageKind`) живут в `lib/`, не в components.

### Route handlers — тонкий слой

Паттерн: `zod → lib/* → prisma → JSON`. Cover pipeline, create/update movie, attach franchise, stats, NDJSON — в `lib/`, routes ~15–25 строк.

### Shared primitives из дублирования

- `ImageCoverUpload` — movie (2:3) и franchise (16:9) как thin wrappers.
- `EmptyState` — EmptyCatalog / EmptyFranchises.
- `ARCHIVE_QUALITY_METRIC_DEFS` — каталог и страница франшизы.
- `probe-from-file` — AddMovieForm и ReleaseEditor.

### Миграция

Одноразовые codemod-скрипты: `scripts/move-lib.mjs`, `scripts/move-components.mjs`. Shims на старых путях **не** оставлялись.

## Consequences

**Плюсы:**

- Навигация по домену вместо алфавитного списка из 100+ файлов.
- Устранены layer violations lib ↔ components.
- Меньше дублирования (cover upload, empty states, probe, quality metrics, slug/cover URL builders).
- Route handlers и страницы проще читать и тестировать (логика в lib, UI в components).
- `npm run typecheck` + `npm test` + `npm run build` проходят после миграции.

**Минусы / trade-offs:**

- Все импорты сменились разом — внешние форки/ветки с flat paths потребуют rebase.
- Codemod не покрывает документацию в training data; rules обновлены вручную (`01-architecture.mdc`).
- Крупный diff — сложнее code review постфактум; фазовые ворота (typecheck + test) обязательны при дальнейших правках.

**Follow-ups (выполнено):**

- Обновлён `.cursor/rules/01-architecture.mdc`.
- Удалены мёртвые API routes и deprecated exports.
- `recomputeAllMovieSlugs` + npm script `db:backfill-slugs`.
- `formatDuration` (display) vs `formatDurationField` (DurationInput) — разведены по именам.
