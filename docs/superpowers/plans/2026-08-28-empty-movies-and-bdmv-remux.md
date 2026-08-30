# Фильмы без релизов + сборка MKV из BDMV

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Сделать фильм (work) независимым от наличия релизов и дать собрать первый (или очередной) MKV из папки Blu-ray BDMV через уже имеющиеся `mkvmerge` / `ffprobe`, без новых утилит.

**Architecture:** Movie остаётся work-level карточкой даже при `releases = []`. Каталог по умолчанию прячет такие карточки (`releases: { some: {} }`), отдельный URL-фильтр `emptyReleases=true` показывает только их. Удаление последнего релиза больше не каскадит `deleteMovie`. Сборка из BDMV - это новый вид `ReleaseBuild` (`kind: bdmv`): inspect плейлистов → пользователь выбирает состав (copy-only reel) → очередь worker → `mkvmerge` stream-copy `.mpls` с фильтром дорожек → `registerBuildOutput`. Transcode и смешивание релизов остаются на `/builds/new` после появления MKV.

**Tech Stack:** Next.js 16 App Router, Prisma 7 + SQLite, zod 4, vitest, существующий worker `scripts/release-build-worker.ts`, `mkvmerge` / `ffprobe` / `ffmpeg` в PATH.

## Global Constraints

- UI и ошибки - **русский**. Код, типы, файлы - английский.
- В пользовательских строках **запрещены** длинное тире (`—`) и слово **«рецепт»** (в UI: состав / дорожки / конфигурация сборки / задание на сборку).
- `params` / `searchParams` - Promise (Next.js 16).
- Бизнес-логика в `src/lib/`, не в route handlers. Zod - единственный source of truth в `src/lib/api/validators*`.
- Prisma include: только `movieInclude` / `releaseInclude` / `franchiseInclude`, не ad-hoc.
- Цвета/радиусы только токенами Cinematic Tech (`globals.css`). Не хардкодить hex в компонентах.
- Иконки: **lucide-react** (уже в проекте). Не подключать Phosphor/Tabler.
- Не ставить новые CLI-утилиты (tsMuxer, MakeMKV, libbluray). Только `mkvmerge`, `ffprobe`, `ffmpeg`, `mkvextract`.
- Миграции только через `npm run db:migrate`.
- После логики: `npm test` и `npm run typecheck`.
- Не коммитить, пока пользователь явно не попросит.

---

# Часть 0. Дизайн (читать целиком до кода)

## 0.1 Зачем

Сейчас Movie и Release связаны жёстче, чем говорит ADR-0001:

- `deleteRelease` при последнем релизе вызывает `deleteMovie` (тест «deletes the movie when removing the only release»).
- Каталог не фильтрует `releases.length === 0`, но создать «чистый» фильм из UI почти нельзя: `buildMovieCreatePayload` **всегда** кладёт объект `release`, даже с пустым `filePath` → в БД появляется фантомный релиз без файла.
- На странице фильма уже есть заглушка `EmptyReleasesCard`, но до неё штатно не добраться.
- BD-папка (`BDMV/STREAM/*.m2ts`) при скане станет десятками черновиков, потому что `.m2ts` уже в `VIDEO_EXTENSIONS`.

Нужный сценарий пользователя:

1. Завести карточку фильма (название, год, жанры, обложка) **без файла**.
2. Положить рядом BDRemux (структура как на скрине: `BDMV/{BACKUP,CLIPINF,PLAYLIST,STREAM,index.bdmv,MovieObject.bdmv}`).
3. Нажать **«Собрать из BDMV файлов»** на странице фильма (пустого или нет).
4. Получить MKV stream-copy в очередь сборок, затем новый Release у этого Movie.

## 0.2 Решения (зафиксировать, не развивать развилку в коде)

### A. Пустой фильм = 0 строк Release

Не путать с релизом, у которого `filePath = null`. Цель: `releases: { none: {} }`. Существующие фантомы (`filePath IS NULL` или `TRIM(filePath) = ''`) **удалить SQL-миграцией** (Movie оставить). После purge фильм, у которого были только фантомы, становится настоящим пустым.

`buildMovieCreatePayload` / `AddMovieForm` больше не отправляют `release`, если пользователь не указал файл. `extractReleaseInputFromMovieCreate`: если пришёл `release` без `filePath` и без треков - считать `null` (защита от старых клиентов).

### B. Каталог прячет пустые по умолчанию

В `buildMovieWhere` для **всех** status-вкладок, если `emptyReleases !== "true"`:

```
appendMovieAnd(where, { releases: { some: {} } })
```

Фильтр `emptyReleases=true` (как `multiRelease=true`): **только** фильмы без релизов, `releases: { none: {} }`. Взаимоисключающ с quality/audio/`tvReady`/`multiRelease`: включение empty сбрасывает эти params; включение quality сбрасывает empty.

Поиск `q` **не** пробивает скрытие. Нашёл карточку по прямой ссылке `/movies/[slug]` - страница открывается всегда.

### C. Удаление последнего релиза не удаляет фильм

`deleteRelease` всегда удаляет только Release (+ jobs). `movieDeleted` всегда `false` (поле можно оставить для совместимости клиента, но больше не редиректить на `/`). Пользователь остаётся на странице фильма и видит empty-state. Удалить work можно только из edit (`deleteMovie`).

### D. BDMV-сборка = вид ReleaseBuild, не новая очередь

| Рассматривалось | Почему нет |
|---|---|
| Новая таблица `BdmvRemux` | Дубль worker/UI `/builds`, progress, cancel/retry |
| Синхронный HTTP/NDJSON | Часы на 50-80 ГБ, не переживает закрытие вкладки |
| ffmpeg `-f bluray` | Нужен libbluray, не гарантирован |
| Склеить самый большой `.m2ts` | Ломается на split-title (несколько клипов в плейлисте) |

**Выбор:** `ReleaseBuild.kind` = `"recipe"` \| `"bdmv"` (default `"recipe"`). Worker уже умеет mkvmerge + heartbeat + register. BDMV: без transcode, `requiresTranscode: false`, вход - `.mpls`, не существующий Release.

Параллельность: copy-recipe jobs как сейчас (unbounded). **BDMV: не больше одного RUNNING** на весь worker (IO-heavy). `assertMovieHasNoActiveBuilds` остаётся (один активный build на фильм).

### E. Mux

mkvmerge читает плейлист и конкатенирует клипы. Главы **оставляем** (не `--no-chapters`). Дорожки: **только выбранные**, stream copy, через уже существующий `buildMkvmergeArgs` (один input = `.mpls`, `videoTrackIds` / `audioTrackIds` / `subtitleTrackIds` из состава, `trackOrder`, default flags, `--track-name`). Не вызывать helper с пустыми id: else-ветка ставит `--no-video`.

Transcode/sync/другие файлы на этой странице нет. После `registerBuildOutput` пользователь может открыть «Собрать релиз» на получившемся MKV.

### E2. Состав на странице BDMV

После `mkvmerge -J` заполнить reel всеми дорожками (включены). Можно снять, переставить, default/forced, переименовать. UI: те же [BuildReel](src/components/builds/BuildReel.tsx) / [BuildReelTrackCard](src/components/builds/BuildReelTrackCard.tsx) с пропом `copyOnly` (спрятать transcode, keepOriginal, sync). Не копировать карточку во второй файл. Не показывать [BuildSourceDecks](src/components/builds/BuildSourceDecks.tsx) (других релизов нет как источника).

`sourceReleaseId` в job = `null`, `sourceFilePath` = playlist, `sourceStreamIndex` = mkvmerge track id. Хотя бы одна video. Смена плейлиста сбрасывает состав.

### F. Inspect плейлистов

1. Резолв корня: пользователь может указать `Foreigner Remux/`, `.../BDMV`, `.../BDMV/PLAYLIST`.
2. Лёгкий бинарный парсер `.mpls` (длительность, имена клипов) - без 50 вызовов mkvmerge.
3. Оценка размера = сумма `STREAM/<clip>.m2ts`.
4. Автовыбор: самый длинный плейлист ≥ 40 мин; если все короче - самый длинный + warning.
5. `mkvmerge -J` **только** на выбранном плейлисте (превью дорожек). Переиспользуем `parseMkvIdentifyJson`.

### G. Скан не заходит в BDMV

В `walkVideoFiles`: не рекурсировать в каталоги `BDMV`, `CERTIFICATE`, `CLIPINF`, `PLAYLIST`, `STREAM`, `BACKUP`, `AACS`. Имена сравнивать case-insensitive. Отдельные `.m2ts` **вне** этой структуры по-прежнему сканируются.

### H. UI-язык

Это **продуктовый** экран Cinematic Tech, не лендинг. Не применять gpt-taste / high-end hero / GSAP / новые шрифты / Phosphor. Опора: `MachinedCard`, `Button`, `FolderPathField`, `EmptyState`, `ConfirmDialog`, сегменты FilterBar, lucide, motion только как у соседних карточек, `prefers-reduced-motion` уже глобальный.

**Design read:** empty-state и мастер BDMV как projection-room console: «слот под диск» + машинная форма постановки в очередь. Акцент золото (`--accent`). Primary CTA одна на экран.

---

## 0.3 UX-потоки

### Поток 1. Создать фильм без файла

```
/movies/new
  → форма только work: название*, год, описание, жанры, обложка
  → POST /api/movies  { title, year, genres, description, status: "CATALOG" }
     без поля release
  → redirect /movies/[slug]
  → EmptyReleasesCard (см. ниже)
```

Не держать на create-форме путь к файлу, storage, треки, тип релиза. Готовый MKV добавляется вторым шагом. Это и есть «разделение».

После создания пользователь **уже на карточке**, не в каталоге. Если уйдёт в `/`, карточка скрыта, пока не включит фильтр «Без релизов» (бейдж-счётчик виден, когда count > 0).

### Поток 2. Пустая страница фильма

Правая колонка - не тонкий абзац, а `MachinedCard`:

- eyebrow `font-mono-tech`: «нет релизов»
- title (display, 1-2 строки): «Сюда ещё не положили файл»
- 2 действия, не три:
  1. **Собрать из BDMV файлов** - `Button variant="primary"`, иконка `Disc3`, href `/movies/[slug]/releases/from-bdmv`
  2. **Добавить готовый файл** - `Button variant="secondary"`, иконка `Plus`, href `/movies/[slug]/releases/new`
- helper под кнопками: «Карточка фильма уже в базе. Релиз появится после сборки или ручного добавления файла.»
- `SpotlightTier tier="standard"` как сейчас

Кнопки `min-h-11`, gap ≥ 8px, loading не нужен (это ссылки). `aria-label` у иконок не нужен: текст на кнопке есть.

### Поток 3. Фильм с релизами: та же кнопка

В меню релиза (`ReleasePanelActions`) пункт **«Собрать из BDMV файлов»** (иконка `Disc3`) - рядом с «Собрать релиз» / «Добавить», **не** danger. Ведёт на тот же `/releases/from-bdmv`.

Дублировать огромную primary-кнопку над табами не надо: primary уже занят работой с текущим релизом. Empty-state - единственное место, где BDMV визуально главный.

### Поток 4. Мастер BDMV (страница, не модалка)

Маршрут: `src/app/movies/[slug]/releases/from-bdmv/page.tsx`  
Оболочка: `ReleaseEditPageLayout` eyebrow `сборка из BDMV`.

Почему страница, не Modal: выбор папки, список плейлистов, превью дорожек, путь вывода, диск, WSL - это плотность `/builds/new`, не диалог удаления.

Состояния (один экран, progressive disclosure, не wizard из 4 URL):

1. **Папка не выбрана.** `FolderPathField` (уже умеет native pick + ручной путь). Hint: «Укажите папку фильма, каталог BDMV или PLAYLIST». Кнопка «Прочитать диск» `min-h-11`, disabled пока путь пустой, `loading` на время inspect.
2. **Inspect OK.** Карточка «основной фильм»: длительность, оценка размера (`formatBytes`), число клипов, число дорожек. Ниже disclosure «Другие плейлисты (N)» - радиосписок, короткие (< 5 мин) в хвосте с меткой «доп. материалы». Смена плейлиста → повторный `mkvmerge -J` только для него (спиннер в блоке дорожек, не весь экран).
3. **Состав (как конструктор, только copy).** Reel дорожек из identify. По умолчанию все включены. Снять лишние, порядок, default/forced, название. Без transcode. Helper: «Состав копируется с диска. Перекодировать звук можно позже, собрав MKV из полученного релиза.»
4. **Куда писать.** Папка + имя файла. Дефолт: родитель BDMV (`Foreigner Remux/`) + `{Title} ({Year}) BDRemux.mkv` через `sanitizeFilename`. `releaseType` по умолчанию `bdremux`. Если у фильма `partCount > 1` - Select серии (`moviePartId`). StoragePicker если вывод на внешний диск.
5. **Предупреждения** (inline, под полем, `role="alert"`): диск не смонтирован (WSL), мало места, нет клипа, плейлист короткий, output совпадает с существующим Release. CTA disabled при error-severity; warning можно подтвердить чекбоксом «Всё равно поставить в очередь» (как `acknowledgeWarnings` у recipe).
6. **Поставить в очередь** - primary. На успех: redirect `/builds/[id]`. Пока request: кнопка `loading`, повторный submit не слать.

Escape: BackLink лейаута на `/movies/[slug]`. Несохранённое состояние мастера не жалко (ничего не записано, пока нет job).

### Поток 5. Очередь `/builds`

Карточка job: для `kind=bdmv` лейбл «BDMV → MKV», не «сборка из релизов». Progress - штатный mkvmerge `--gui-mode`. Cancel/retry как у recipe. После SUCCEEDED - ссылка на новый релиз фильма.

### Поток 6. Каталог: фильтр

Рядом с `MultiReleaseFilter` в `FilterToolbarControls` - такой же сегмент-иконка:

- иконка `CircleOff` (lucide)
- tooltip title: «Без релизов»
- description: «Карточки фильмов, к которым ещё не привязан файл. По умолчанию скрыты.»
- `aria-pressed`, `min-h-8 min-w-8`
- бейдж-счётчик, если count > 0 (как у черновиков)
- показывать контрол, если count > 0 **или** фильтр активен

URL: `?emptyReleases=true`. В `SCALAR_KEYS` и `CLEAR_ALL_FILTER_PARAMS`.

Empty catalog при активном фильтре: `EmptyState` «Нет фильмов без релизов» + ссылка «Добавить фильм» → `/movies/new`. Не подсовывать страницу скана.

### Поток 7. Карточка в сетке (только под фильтром)

`MovieCard` при 0 релизов уже не падает (primary = null). Добавить:

- без spec-чипов качества
- `font-mono-tech` метка «нет релизов» (не цвет-only: текст)
- без ruby/gold glow (`tier = null`)
- обложка / placeholder как обычно

### Поток 8. Удаление последнего релиза

Диалог сейчас: «Это единственный релиз - вместе с ним из каталога удалится и сам фильм.»

Новый текст:

- title: «Удалить релиз?»
- body: «Это единственный релиз фильма. Карточка фильма останется без файла и будет скрыта в каталоге, пока не появится новый релиз. Файл MKV можно оставить на диске или удалить вместе с записью.»
- после успеха: `router.refresh()` на той же странице, **не** `router.push("/")`.

---

## 0.4 Edge cases (обязательно покрыть тестами или явным UI)

| # | Кейс | Поведение |
|---|---|---|
| 1 | Удалить последний релиз | Movie жив, `primaryReleaseId = null`, empty-state |
| 2 | Удалить фильм из edit | Как сейчас, cascade релизов |
| 3 | Create movie без файла | 0 Release, redirect на карточку |
| 4 | Старый клиент шлёт `release: { filePath: null }` | Не создавать релиз |
| 4a | Уже лежащие в БД релизы с NULL/пустым path | Data-миграция удаляет их; Movie жив |
| 4b | Фильм с нормальным MKV + фантом | Удалить только фантом, настоящий релиз не трогать |
| 5 | Пустой фильм + поиск `q` | Не в выдаче, пока нет `emptyReleases=true` |
| 6 | Пустой + фильтр 4K | Empty-фильтр сбрасывается (взаимоисключение) |
| 7 | Прямой URL `/movies/slug` пустого | 200, empty-state |
| 8 | `/movies/slug/builds/new` без релизов | `notFound()` как сейчас (конструктору нечего смешивать) |
| 9 | `/releases/from-bdmv` без релизов | 200, мастер работает |
| 10 | Франшиза / ремейк / рейтинг / обложка | Живут на Movie, не требуют релиза |
| 11 | Merge пустого с фильмом, у которого есть релизы | Штатный merge, релизы переезжают на канон |
| 12 | Скан корня с `Movie/BDMV/STREAM/*.m2ts` | Не импортировать эти m2ts |
| 13 | Скан одиночного `foo.m2ts` вне BDMV | Как сейчас, это релиз |
| 14 | Папка = родитель с `BDMV` внутри | Резолв в этот BDMV |
| 15 | Папка = сам `BDMV` или `PLAYLIST` | Резолв вверх/как есть |
| 16 | Два BDMV в одной папке | Взять тот, где сумма STREAM больше; warning |
| 17 | Нет `PLAYLIST/*.mpls` | 400 «Не похоже на Blu-ray: нет плейлистов» |
| 18 | Клип из mpls отсутствует в STREAM | error, CTA disabled |
| 19 | Все плейлисты < 40 мин | Взять max + warning «похоже на доп. материалы» |
| 20 | Несколько плейлистов с почти равной длительностью (multi-angle) | Показать оба, автовыбор первый по имени файла |
| 21 | Encrypted / битый поток | Job FAILED, `errorMessage` из stderr mkvmerge, русская обёртка |
| 22 | ISO-образ | Вне скоупа. Если пользователь указал `.iso` - «Нужна распакованная папка BDMV» |
| 23 | WSL диск не примонтирован (источник или output) | Как export/move: `WslDriveUnmountedError` + UI смонтировать |
| 24 | Мало места (output диск < оценка размера + 1 ГБ) | error до enqueue |
| 25 | `outputPath` уже есть как `Release.filePath` | 400, как у recipe validate |
| 26 | Файл output уже на диске | Не затирать; 400 «файл уже существует» |
| 27 | Активный build у этого фильма | 409 «У фильма уже есть активная сборка» |
| 28 | Второй BDMV job в глобальной очереди | QUEUED, стартует после окончания RUNNING bdmv |
| 29 | Cancel во время mkvmerge | Как recipe: kill + удалить `.part.mkv` |
| 30 | Worker упал на RUNNING | stale recovery как ADR-0006; part-файл не считать готовым |
| 31 | multipart фильм | опциональный Select серии; иначе `moviePartId = null` |
| 32 | Обложка | после register - `maybeExtractCover` best-effort, как create movie |
| 33 | `filePath` unique + null | несколько релизов с null path больше не плодим |
| 34 | Счётчик каталога | pagination `total` совпадает с видимой сеткой (без пустых). `getStatusCounts` может считать все Movie - не использовать его как число карточек на главной |
| 35 | Facets | считать только фильмы с релизами (иначе жанр пустышки попадёт в чип, а карточки нет) |
| 36 | Сортировка duration/fileSize на empty-only | пустые → 0, порядок стабильный по title |
| 37 | DRAFT empty | тоже скрыт на вкладке черновиков, пока нет фильтра |
| 38 | Кнопка BDMV при отсутствии mkvmerge | мастер открывается, CTA disabled, текст «mkvmerge не найден в PATH» (`getBuildCapabilities`) |
| 39 | Путь с кириллицей / пробелами | `normalizeFilePathInput` / `commitFilePathInput` как везде |
| 40 | Симлинк BDMV | `stat`/`readdir` как есть; не ходить в бесконечный цикл (сканер уже не следует за dot-dirs; для BDMV достаточно не рекурсить по имени) |
| 41 | Состав без видео | CTA disabled, enqueue 400 |
| 42 | Сменили плейлист после правок состава | Confirm + сброс к identify нового `.mpls` |

Вне скоупа v1: transcode/sync на странице BDMV, подмешивание других MKV в этот job, ISO/loop-mount, 3D playlist, автоматическое удаление исходной BDMV-папки после успеха.

---

## 0.5 Модель данных

Миграция Prisma (следующий номер после текущих в `prisma/migrations/`):

```prisma
enum ReleaseBuildKind {
  recipe
  bdmv
}

model ReleaseBuild {
  // существующие поля без изменения смысла
  kind        ReleaseBuildKind @default(recipe)
  moviePartId Int?
  moviePart   MoviePart?       @relation(fields: [moviePartId], references: [id], onDelete: SetNull)
  // ...
  @@index([kind, status])
}

model MoviePart {
  // добавить обратную сторону
  builds ReleaseBuild[]
}
```

`ReleaseBuildSource.role` для BDMV:

- `"bdmv-playlist"` - путь к `.mpls` (обязателен, 1 шт)
- `"bdmv-root"` - канонический путь к `BDMV` (для UI)
- клипы в sources **не обязательны** (mkvmerge сам найдёт); для ошибки «клип не найден» достаточно проверки на inspect, не на enqueue

`ReleaseBuildTrack` для BDMV: **заполнены**. `sourceReleaseId` null, `sourceFilePath` = `.mpls`, `sourceStreamIndex` = mkvmerge id, `audioMode` COPY. Runner читает tracks и собирает `buildMkvmergeArgs`.

SQLite: Prisma enum → TEXT. Default `"recipe"` закрывает старые строки.

---

## 0.6 API

| Method | Path | Назначение |
|---|---|---|
| POST | `/api/movies/[id]/bdmv/inspect` | Резолв корня + список плейлистов + (опционально) identify выбранного |
| POST | `/api/movies/[id]/bdmv/builds` | Enqueue BDMV job |
| GET | `/api/catalog/empty-count?status=` | Счётчик для бейджа фильтра (или отдать из `loadCatalogPage` без отдельного route) |

Inspect body:

```ts
{ bdmvPath: string, playlistPath?: string }
```

Inspect 200:

```ts
{
  bdmvRoot: string,
  playlists: Array<{
    path: string,
    fileName: string,
    durationSeconds: number | null,
    estimatedBytes: number,
    clipCount: number,
    missingClips: string[],
    likelyMain: boolean,
  }>,
  selected: {
    path: string,
    tracks: { video: [...], audio: [...], subtitles: [...] },
    durationSeconds: number | null,
  } | null,
  warnings: Array<{ code: string, message: string }>,
}
```

Enqueue body (zod `bdmvRemuxCreateSchema`):

```ts
{
  bdmvRoot: string,
  playlistPath: string,
  outputPath: string,
  outputReleaseType?: string, // default "bdremux"
  outputVersion?: string,
  externalStorageId?: number | null,
  moviePartId?: number | null,
  acknowledgeWarnings?: boolean,
  tracks: Array<{
    kind: "video" | "audio" | "subtitle",
    sourceStreamIndex: number, // mkvmerge track id
    label?: string,
    isDefault?: boolean,
    forced?: boolean,
  }>,
}
```

Refine: `tracks` не пустой, есть ровно те id, которые есть в identify выбранного плейлиста, минимум одна video. `audioMode` на сервере всегда copy.

Ответ 201: тот же `serializeBuild`, плюс `kind: "bdmv"`.

Ошибки: `{ error: string }` по-русски. 400 валидация, 409 активный build, 503 нет mkvmerge.

---

## 0.7 Карта файлов

**Создать**

- `prisma/migrations/<ts>_empty_movies_bdmv_build_kind/migration.sql` (через `npm run db:migrate`)
- `docs/adr/0019-movies-without-releases.md`
- `docs/adr/0020-bdmv-remux-builds.md`
- `src/lib/media/bdmv/bdmv-root.ts` - резолв папки
- `src/lib/media/bdmv/mpls-parse.ts` - парсер
- `src/lib/media/bdmv/bdmv-inspect.ts` - оркестрация inspect
- `src/lib/media/bdmv/*.test.ts` + фикстуры в `src/lib/media/bdmv/fixtures/`
- `src/lib/builds/bdmv-queue.ts` - enqueue
- `src/lib/builds/bdmv-runner.ts` - mkvmerge playlist
- `src/lib/api/validators/bdmv.ts`
- `src/app/api/movies/[id]/bdmv/inspect/route.ts`
- `src/app/api/movies/[id]/bdmv/builds/route.ts`
- `src/app/movies/[slug]/releases/from-bdmv/page.tsx`
- `src/components/releases/BdmvRemuxEditor.tsx`
- `src/components/releases/BdmvPlaylistList.tsx`

**Изменить (ключевое)**

- `prisma/schema.prisma` - enum + поля
- `src/lib/releases/delete-release.ts` + `.test.ts`
- `src/lib/movies/movie-query.ts` + `.test.ts`
- `src/lib/movies/build-movie-payload.ts` + `.test.ts`
- `src/lib/releases/release-api.ts` - `extractReleaseInputFromMovieCreate`
- `src/components/movies/AddMovieForm.tsx`
- `src/components/movies/EmptyReleasesCard.tsx`
- `src/components/movies/MovieCard.tsx`
- `src/components/releases/ReleasePanelActions.tsx`
- `src/components/catalog/FilterToolbarControls.tsx`, `FilterBar.tsx`
- `src/lib/catalog/filter-bar-utils.ts`
- `src/lib/catalog/catalog-facets.ts` + archive-metrics если считают Movie без релиза в жанрах
- `src/lib/media/scanner.ts` + тест на skip dirs
- `src/lib/builds/build-runner.ts` - ветка kind
- `src/lib/builds/build-serialize.ts`, `build-queue-display.ts`, `build-detail-display.ts`
- `src/lib/worker/claim-next-media-job.ts` - cap 1 RUNNING bdmv
- `src/lib/builds/build-register.ts` - moviePartId + maybeExtractCover
- `src/components/builds/BuildReelTrackCard.tsx` - `copyOnly`
- `src/components/builds/*` - лейбл BDMV
- `.cursor/rules/01-architecture.mdc`, `02-data-model.mdc`, `03-api-routes.mdc`, `05-domain-pipelines.mdc`, `07-project-map.mdc`
- `docs/adr/README.md`

---

# Часть 1. Задачи реализации

Порядок обязателен: схема + **purge фантомов**, потом форма/delete/каталог, потом BDMV inspect, queue/worker, UI мастера. Каждый task заканчивается тестом или typecheck.

### Task 1: ADR + схема Prisma

**Files:**
- Create: `docs/adr/0019-movies-without-releases.md`
- Create: `docs/adr/0020-bdmv-remux-builds.md`
- Modify: `docs/adr/README.md`
- Modify: `prisma/schema.prisma`

- [ ] **Step 1.** ADR-0019: Movie может существовать без Release; каталог default-hide; last-release больше не удаляет Movie; фантомы с null/пустым path удалить миграцией и больше не создавать. Status: Accepted. Date: 2026-08-28.

- [ ] **Step 2.** ADR-0020: BDMV remux как `ReleaseBuild.kind = bdmv`; mux через mkvmerge `.mpls`; inspect своим парсером mpls + точечный `mkvmerge -J`; без новых утилит; cap 1 RUNNING bdmv. Status: Accepted.

- [ ] **Step 3.** В индекс ADR добавить 0019 и 0020.

- [ ] **Step 4.** В `schema.prisma`:

```prisma
enum ReleaseBuildKind {
  recipe
  bdmv
}
```

На `ReleaseBuild` добавить:

```prisma
kind        ReleaseBuildKind @default(recipe)
moviePartId Int?
moviePart   MoviePart? @relation(fields: [moviePartId], references: [id], onDelete: SetNull)

@@index([kind, status])
```

На `MoviePart` добавить `builds ReleaseBuild[]`.

- [ ] **Step 5.** `npm run db:migrate` с именем `empty_movies_bdmv_build_kind`. Не править SQL руками после генерации, кроме необходимости SQLite default.

- [ ] **Step 6.** `npx prisma generate` (обычно post-migrate). Прогнать `npm run typecheck` - починить места, где `ReleaseBuild` создаётся без `kind` (default закрывает).

---

### Task 1b: Зачистка фантомных релизов (data-миграция)

**Files:**
- Create: `prisma/migrations/<ts>_purge_phantom_releases/migration.sql` через `npx prisma migrate dev --create-only --name purge_phantom_releases` (data-only, схема не меняется). Не скрипт в `scripts/`.

Критерий фантома:

```sql
filePath IS NULL OR TRIM(filePath) = ''
```

`ReleaseExport` / `ReleaseMove` имеют `onDelete: Restrict`. Нельзя `DELETE FROM Release` одним запросом.

- [ ] **Step 1.** SQL в миграции (имена таблиц Prisma SQLite, кавычки как в соседних migration.sql):

```sql
-- Phantom = no real file on disk. Keep Movie rows.

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
```

VideoTrack / AudioTrack / SubtitleTrack каскадятся с Release. Movie не удалять.

- [ ] **Step 2.** Применить `npm run db:migrate`. Проверка: `SELECT COUNT(*) FROM "Release" WHERE "filePath" IS NULL OR TRIM("filePath") = '';` → 0.

- [ ] **Step 3.** Фильм, у которого были только фантомы, должен иметь 0 релизов (это и есть целевое пустое состояние). Фильм с нормальным файлом + фантомом сохраняет только файловый релиз.

---

### Task 2: Не создавать фантомный релиз + форма «только фильм»

**Files:**
- Modify: `src/lib/movies/build-movie-payload.ts`
- Modify: `src/lib/movies/build-movie-payload.test.ts`
- Modify: `src/lib/releases/release-api.ts` (`extractReleaseInputFromMovieCreate`)
- Modify: `src/components/movies/AddMovieForm.tsx`
- Test: `src/lib/movies/create-movie.test.ts` (добавить кейс create без файла, если там ещё нет)

**Interfaces:**
- `buildMovieCreatePayload` не кладёт `release`, если нет runtime file path.
- `extractReleaseInputFromMovieCreate`: `data.release` без `filePath` и без video/audio/sub → `null`.

- [ ] **Step 1.** Тест payload:

```ts
it("omits release when file path is empty", () => {
  const payload = buildMovieCreatePayload({
    title: "The Foreigner",
    year: 2017,
    description: null,
    externalStorageId: null,
    releaseType: null,
    genres: ["action"],
    durationSeconds: null,
    filePath: null,
    video: emptyVideoFieldState(),
    audioRows: [emptyAudioFormRow({ isDefault: true })],
    subtitleRows: [],
  });
  expect(payload.release).toBeUndefined();
});
```

- [ ] **Step 2.** Тест extract:

```ts
it("ignores empty nested release", () => {
  expect(
    extractReleaseInputFromMovieCreate({
      title: "X",
      release: { filePath: null },
    }),
  ).toBeNull();
});
```

- [ ] **Step 3.** Реализовать. В `AddMovieForm` убрать секции файла, storage, типа релиза, треков, автозаполнения ffprobe. Оставить: title, year, description, genres, cover. Submit как сейчас, redirect на `/movies/${slug}`.

- [ ] **Step 4.** `npm test` по затронутым файлам + `npm run typecheck`.

Копия UI на `/movies/new`: eyebrow можно сменить на «карточка фильма»; подзаголовок формы: «Файл добавите следующим шагом: готовый MKV или сборка из BDMV.» Без слова «рецепт».

---

### Task 3: deleteRelease больше не удаляет Movie

**Files:**
- Modify: `src/lib/releases/delete-release.ts`
- Modify: `src/lib/releases/delete-release.test.ts`
- Modify: `src/components/releases/ReleasePanelActions.tsx`

- [ ] **Step 1.** Заменить тест `deletes the movie when removing the only release` на:

```ts
it("keeps the movie when removing the only release", async () => {
  // ... тот же setup с одним релизом
  const result = await deleteRelease(movie.id, releaseId);
  expect(result.movieDeleted).toBe(false);
  expect(await prisma.movie.findUnique({ where: { id: movie.id } })).not.toBeNull();
  expect(await prisma.release.findUnique({ where: { id: releaseId } })).toBeNull();
  const movieRow = await prisma.movie.findUnique({
    where: { id: movie.id },
    select: { primaryReleaseId: true },
  });
  expect(movieRow?.primaryReleaseId).toBeNull();
  await prisma.movie.delete({ where: { id: movie.id } });
});
```

- [ ] **Step 2.** В `deleteRelease` удалить ветку `if (isLastRelease) { deleteMovie }`. Всегда: почистить export/move jobs, обнулить `primaryReleaseId`, `tx.release.delete`. Вернуть `movieDeleted: false`. Импорт `deleteMovie` убрать.

- [ ] **Step 3.** В `ReleasePanelActions`:
  - текст диалога для `releaseCount <= 1` - см. Поток 8;
  - после DELETE не делать `router.push("/")` по `movieDeleted`.

- [ ] **Step 4.** `npm test -- src/lib/releases/delete-release.test.ts`.

---

### Task 4: Скрытие пустых в каталоге + фильтр

**Files:**
- Modify: `src/lib/api/validators/movie.ts` (`movieListQuerySchema` + `emptyReleases`)
- Modify: `src/lib/movies/movie-query.ts` + `.test.ts`
- Modify: `src/lib/catalog/filter-bar-utils.ts`
- Modify: `src/lib/catalog/catalog-facets.ts` (+ тест): where всегда `releases: { some: {} }` для facet counts
- Modify: `src/lib/catalog/load-catalog-page.ts` - посчитать `emptyReleaseCount` для текущей status-вкладки
- Modify: `src/components/catalog/FilterToolbarControls.tsx`, `FilterBar.tsx`, `MovieCatalog.tsx`
- Modify: `src/components/catalog/EmptyCatalog.tsx` - проп для empty-filter view
- Modify: `src/components/movies/MovieCard.tsx`

**Query param:** `emptyReleases: z.string().optional()` , активен при `"true"`.

- [ ] **Step 1.** Тесты `movie-query.test.ts`:

```ts
it("hides movies without releases by default", () => {
  const where = buildMovieWhere(parseListQuery(new URLSearchParams()));
  // AND содержит { releases: { some: {} } }
});

it("emptyReleases=true selects only movies with no releases", () => {
  const where = buildMovieWhere(
    parseListQuery(new URLSearchParams("emptyReleases=true")),
  );
  // { releases: { none: {} } }, без releaseSome quality
});
```

- [ ] **Step 2.** Реализация `buildMovieWhere`:

```ts
if (query.emptyReleases === "true") {
  appendMovieAnd(where, { releases: { none: {} } });
  // не набирать releaseFilters / ruby / tvReady / multiRelease
} else {
  appendMovieAnd(where, { releases: { some: {} } });
  // существующая логика quality как сейчас
}
```

Если `emptyReleases=true` и одновременно `multiRelease=true` - empty побеждает (UI не даст обоих, сервер всё равно безопасен).

- [ ] **Step 3.** `EmptyReleasesFilter` по образцу `MultiReleaseFilter`. Включение: `updateParams({ emptyReleases: "true", resolution: null, hdr: null, premiumAudio: null, tvReady: null, multiRelease: null, /* audio facet keys из CLEAR_FACET_PARAMS */ })`. Выключение: `emptyReleases: null`.

- [ ] **Step 4.** `MovieCard`: если `releaseCount === 0`, показать метку «нет релизов», не рендерить hdr/audio chips.

- [ ] **Step 5.** `EmptyCatalog`: если `emptyReleases` активен - title «Нет карточек без релизов», action Link `/movies/new` «Добавить фильм».

- [ ] **Step 6.** `npm test` query + facets. Прогнать главную: без фильтра пустые не видны; `?emptyReleases=true` показывает.

---

### Task 5: EmptyReleasesCard + пункт меню BDMV

**Files:**
- Modify: `src/components/movies/EmptyReleasesCard.tsx`
- Modify: `src/components/releases/ReleasePanelActions.tsx`

UI empty-state (токены, не hex):

```tsx
<MachinedCard variant="calm">
  <SpotlightTier tier="standard" />
  <CardSectionHeader label="нет релизов" title="Сюда ещё не положили файл" />
  <p className="text-sm text-muted">Карточка фильма уже в базе. Релиз появится после сборки или ручного добавления файла.</p>
  <div className="mt-4 flex flex-col gap-2 sm:flex-row">
    <Button variant="primary" className="min-h-11" asChild>
      <Link href={`/movies/${movieSlug}/releases/from-bdmv`}>
        <Disc3 className="h-4 w-4" aria-hidden />
        Собрать из BDMV файлов
      </Link>
    </Button>
    <Button variant="secondary" className="min-h-11" asChild>
      <Link href={`/movies/${movieSlug}/releases/new`}>
        <Plus className="h-4 w-4" aria-hidden />
        Добавить готовый файл
      </Link>
    </Button>
  </div>
</MachinedCard>
```

Если `Button` не умеет `asChild` - обернуть `Link` стилями `Button` нельзя вслепую: либо расширить primitive пропом `href` (не надо), либо `<Link className={same classes as Button primary}>`. **Не копировать Button в новый файл.** Предпочтительно: Link с теми же utility-классами, что у `Button` variant primary/secondary (они публичны в том же файле - лучше добавить optional `href` не надо; используй `<Link>` + className, дублировать variants из Button один раз нельзя - вынеси `buttonVariantClass(variant)` в `Button.tsx` и переиспользуй).

В меню релиза: пункт после «Собрать релиз»:

```
label="Собрать из BDMV файлов"
href={`/movies/${movieSlug}/releases/from-bdmv`}
icon={<Disc3 />}
```

Кнопка видна и на пустом, и на непустом фильме.

---

### Task 6: Сканер пропускает дерево BDMV

**Files:**
- Modify: `src/lib/media/scanner.ts`
- Test: `src/lib/media/scanner.test.ts` (создать, если нет) или вынести `shouldSkipScanDir(name: string): boolean` в `src/lib/media/scan-skip-dirs.ts` и тестировать pure.

```ts
const SKIP_DIR_NAMES = new Set([
  "bdmv", "certificate", "clipinf", "playlist", "stream", "backup", "aacs",
]);

export function shouldSkipScanDir(name: string): boolean {
  if (name.startsWith(".")) return true; // уже есть skip dot-dirs
  return SKIP_DIR_NAMES.has(name.toLowerCase());
}
```

В `walkVideoFiles` перед рекурсией: если `dirent.isDirectory() && shouldSkipScanDir(dirent.name)` → continue.

Тесты:

- `shouldSkipScanDir("BDMV") === true`
- `shouldSkipScanDir("STREAM") === true`
- `shouldSkipScanDir("Movies") === false`
- `shouldSkipScanDir(".hidden") === true`

`.m2ts` остаётся в `VIDEO_EXTENSIONS`.

---

### Task 7: Парсер MPLS + резолв корня BDMV

**Files:**
- Create: `src/lib/media/bdmv/bdmv-root.ts`
- Create: `src/lib/media/bdmv/bdmv-root.test.ts`
- Create: `src/lib/media/bdmv/mpls-parse.ts`
- Create: `src/lib/media/bdmv/mpls-parse.test.ts`
- Create: `src/lib/media/bdmv/fixtures/minimal.mpls` (бинарная фикстура)

**Резолв `resolveBdmvRoot(inputPath: string): { bdmvRoot: string, playlistDir: string, streamDir: string }`**

Нормализовать через `normalizeFilePathInput`. Алгоритм:

1. Если `basename === "PLAYLIST"` и сосед `../STREAM` существует → bdmvRoot = dirname.
2. Если basename (case-insensitive) `BDMV` и есть `PLAYLIST` внутри → это корень.
3. Если есть child `BDMV/PLAYLIST` → взять его.
4. Если несколько child `**/BDMV` на одном уровне - выбрать max sum of STREAM file sizes, warning `multiple-bdmv`.
5. Иначе throw `Error("Не похоже на Blu-ray: нет каталога BDMV/PLAYLIST")`.

Не принимать путь к `.iso`.

**Парсер `parseMpls(buffer: Buffer): { clips: string[], durationSeconds: number }`**

Формат (big-endian):

- bytes 0-3: `"MPLS"`
- bytes 4-7: версия `"0100"` / `"0200"` / `"0300"` (другие - throw)
- u32be @ 8: `playlistStartAddress`
- @ playlistStartAddress: u32 length, u16 reserved, u16be `numberOfPlayItems`, u16be `numberOfSubPaths`
- PlayItem loop: u16be `itemLength` (длина **остатка**), затем 5 ASCII clip id, 4 bytes `"M2TS"`, skip 3 bytes, u32be `inTime`, u32be `outTime` (45 kHz). Длительность item = max(0, out-in)/45000. Клип = clip id. Следующий item = текущий + 2 + itemLength.

Если magic не MPLS - throw. Тесты на фикстуре: известные clip names и duration.

Оценка байт: для каждого unique clip `stat(join(streamDir, clip + ".m2ts"))`. Missing → в `missingClips`.

`MAIN_PLAYLIST_MIN_SECONDS = 40 * 60`. `likelyMain` = duration max среди тех, кто ≥ порога, иначе просто max.

Не вызывать mkvmerge в этом task.

---

### Task 8: Inspect API (плейлисты + mkvmerge -J на выбранном)

**Files:**
- Create: `src/lib/media/bdmv/bdmv-inspect.ts` + `.test.ts` (мок execa)
- Create: `src/lib/api/validators/bdmv.ts`
- Create: `src/app/api/movies/[id]/bdmv/inspect/route.ts`
- Reuse: `parseMkvIdentifyJson` из `src/lib/builds/build-inspection.ts`
- Reuse: `assertWslDriveMounted` на `bdmvRoot`

Zod:

```ts
export const bdmvInspectSchema = z.object({
  bdmvPath: z.string().min(1),
  playlistPath: z.string().min(1).optional(),
});
```

`inspectBdmv(bdmvPath, playlistPath?)`:

1. `assertWslDriveMounted(bdmvPath)` (no-op если не Windows-drive).
2. `resolveBdmvRoot`.
3. `readdir(playlistDir)` → `*.mpls` (case-insensitive).
4. Для каждого: `parseMpls` + размеры клипов. Сломанный файл - пропустить с warning, не валить весь inspect.
5. Сортировка: duration desc, затем fileName.
6. `selectedPath` = playlistPath если валиден, иначе likelyMain.
7. `execa("mkvmerge", ["-J", selectedPath], { timeout: 60_000 })` → tracks. Если mkvmerge падает - selected.tracks = [] + warning `identify-failed`.
8. Вернуть DTO из §0.6.

Route: `parseRouteId`, movie должен существовать, `parseRequestBody`, `mapDomainError`.

Тест: мок fs + мок execa, один mpls, selected.tracks заполнены из JSON как у `parseMkvIdentifyJson`.

---

### Task 9: Enqueue + runner BDMV + cap RUNNING

**Files:**
- Create: `src/lib/builds/bdmv-queue.ts` + `.test.ts`
- Create: `src/lib/builds/bdmv-runner.ts` + `.test.ts` (args builder)
- Modify: `src/lib/builds/build-runner.ts`
- Modify: `src/lib/worker/claim-next-media-job.ts`
- Modify: `src/lib/builds/build-register.ts`
- Modify: `src/lib/api/validators/bdmv.ts` - create schema
- Create: `src/app/api/movies/[id]/bdmv/builds/route.ts`
- Reuse: `buildMkvmergeArgs` из [build-mkvmerge.ts](src/lib/builds/build-mkvmerge.ts)

Один input = playlist. `videoTrackIds` / `audioTrackIds` / `subtitleTrackIds` **обязательно передать массивы выбранных mkv id** (пустой массив своей kind → `--no-audio` / `--no-subtitles` это ок; video пустым быть не должен). `trackOrder` из sortOrder состава. `noChapters: false`.

```ts
export function bdmvTracksToMkvmergePlan(
  outputPath: string,
  playlistPath: string,
  tracks: Array<{
    sortOrder: number;
    kind: "video" | "audio" | "subtitle";
    mkvTrackId: number;
    isDefault: boolean;
    name?: string;
  }>,
): MkvMergePlan {
  // один MkvMergeInputFile, ids сгруппированы по kind, trackOrder = buildMkvmergeOutputPlan
}
```

Тест: выбранные audio 2,3 → есть `--audio-tracks 2,3`; невыбранное video не попадает; нет голого `playlistPath` без фильтров kind.

`enqueueBdmvRemux(movieId, input)`:

1. `assertBuildCapabilities` (mkvmerge+ffprobe достаточно; ffmpeg не обязателен для этого kind, но capabilities-хелпер сейчас требует все три - **не ломать recipe**. Для BDMV route проверять только mkvmerge+ffprobe:

```ts
if (!caps.mkvmerge.available) return "mkvmerge не найден в PATH";
if (!caps.ffprobe.available) return "ffprobe не найден в PATH";
```

2. `assertMovieHasNoActiveBuilds`.
3. `assertWslDriveMounted` на playlist и output.
4. Повторный inspect: `missingClips.length && throw`.
5. Output: `normalizeFilePathInput`, должен оканчиваться на `.mkv`; `access` → если существует throw «Файл уже существует»; коллизия `Release.filePath` как в `validateBuildRecipe`.
6. Disk space: существующий `/api/disk-space` helper (найти в `lib`, не дублировать) - если free < estimated + 1GB → throw.
7. `outputPath` part-файл: тот же `buildPartPath(outputPath, jobId)` что у recipe.
8. prisma create:

```ts
{
  movieId,
  kind: "bdmv",
  status: "QUEUED",
  requiresTranscode: false,
  outputPath,
  outputReleaseType: input.outputReleaseType ?? "bdremux",
  outputVersion: input.outputVersion ?? "theatrical",
  externalStorageId: input.externalStorageId ?? null,
  moviePartId: input.moviePartId ?? null,
  sources: {
    create: [
      { role: "bdmv-root", filePath: bdmvRoot, releaseId: null },
      { role: "bdmv-playlist", filePath: playlistPath, releaseId: null },
    ],
  },
  tracks: {
    create: input.tracks.map((track, sortOrder) => ({
      sortOrder,
      kind: track.kind.toUpperCase(),
      sourceReleaseId: null,
      sourceStreamIndex: track.sourceStreamIndex,
      sourceFilePath: playlistPath,
      sourceTrackLabel: track.label ?? null,
      audioMode: track.kind === "audio" ? "COPY" : null,
      isDefault: track.isDefault ?? false,
      forced: track.forced ?? false,
    })),
  },
}
```

`runBuildJob`: сразу после загрузки build, если `build.kind === "bdmv"` → `runBdmvBuildJob(buildId)` и return.

`runBdmvBuildJob`: heartbeat, phase `mux`, `execa("mkvmerge", args, { stdout parse progress })` как recipe mux-часть, atomic rename part→output, `registerBuildOutput`, `maybeExtractCover`, `finishBuild SUCCEEDED`. Cancel: тот же `cancelRequested`. На ошибке FAILED + русский `errorMessage`.

`registerBuildOutput`: если `build.moviePartId`, передать в `createReleaseWithTracks` / update release. Если такого поля нет на create input - `prisma.release.update({ moviePartId })` сразу после create.

**Claim cap:** в `claimAvailableMediaJobs` перед циклом copy-builds:

```ts
const runningBdmv = await prisma.releaseBuild.count({
  where: { status: "RUNNING", kind: "bdmv" },
});
```

В цикле `claimNextQueuedBuild(false)`: если кандидат `kind === "bdmv"` и `runningBdmv >= 1` - skip (findFirst с `kind: "recipe"` OR отдельный двухшаговый claim: сначала все recipe copy, потом один bdmv если runningBdmv===0).

Не запускать два BDMV даже на разных фильмах.

Тест claim: мокать сложно (интеграция prisma). Минимум: unit на `bdmvTracksToMkvmergePlan` + enqueue validation (нет video → throw, неизвестный mkv id → throw). Claim описать комментарием и проверить ручным сценарием.

Route POST 201 `serializeBuild`. Добавить `kind` в serialize (иначе UI не отличит).

---

### Task 10: UI мастер `/releases/from-bdmv`

**Files:**
- Create: `src/app/movies/[slug]/releases/from-bdmv/page.tsx` (RSC: load movie by slug, `ReleaseEditPageLayout`, **не** `notFound` при 0 релизов)
- Create: `src/components/releases/BdmvRemuxEditor.tsx` (`"use client"`)
- Create: `src/components/releases/BdmvPlaylistList.tsx`
- Modify: `src/components/builds/BuildReelTrackCard.tsx` - проп `copyOnly`
- Modify: `src/lib/builds/build-filename.ts` - `suggestBdmvOutputPath({ movieTitle, movieYear, bdmvRoot })` → `join(dirname(bdmvRoot) /* parent of BDMV */, sanitizeFilename(`${title}${year} BDRemux.mkv`))`

Страница:

```tsx
const movie = await prisma.movie.findUnique({
  where: { slug },
  include: { parts: { orderBy: { partNumber: "asc" } } },
});
if (!movie) notFound();
return (
  <ReleaseEditPageLayout movie={...} eyebrow="сборка из BDMV" fillViewport>
    <BdmvRemuxEditor movieId={movie.id} movieSlug={movie.slug} movieTitle={movie.title} movieYear={movie.year} parts={movie.parts} />
  </ReleaseEditPageLayout>
);
```

Клиент:

- `FolderPathField` + кнопка «Прочитать диск» → POST inspect.
- Ошибки под полем (`text-sm text-danger`, `role="alert"`).
- Список плейлистов: radio, preselect `likelyMain`. Метка «основной фильм» только у likelyMain. Duration `formatDuration`, size `formatBytes`. Missing clips - danger, нельзя выбрать.
- Смена radio → inspect с `playlistPath`; если состав уже меняли - ConfirmDialog «Сменить плейлист и сбросить состав?»
- Состав: `BuildReel` + `BuildReelTrackCard copyOnly`. Сид из identify, все включены. Удаление/порядок/default/forced/название. CTA disabled если нет video. Не показывать transcode и колоду других релизов.
- Output: поле пути (можно `Field` + pick directory для папки + filename). Дефолт из suggest после успешного inspect.
- Parts select только если `parts.length > 0`.
- Capabilities: GET `/api/builds/capabilities` на mount. Если нет mkvmerge - баннер, CTA disabled.
- Submit POST `/api/movies/${id}/bdmv/builds`, loading на кнопке, disable double-submit.
- Успех: `router.push(`/builds/${id}`)`.

A11y: labels не placeholder-only; radio group `role="radiogroup"` `aria-label="Плейлист"`; focus ring штатный; не полагаться на hover.

Копии (без тире-длинного):

- «Укажите папку фильма, каталог BDMV или PLAYLIST.»
- «Основной фильм выбран по длительности. Короткий плейлист обычно содержит трейлеры.»
- «Состав копируется с диска. Перекодировать звук можно позже через сборку из полученного релиза.»
- CTA: «Поставить в очередь»
- Cancel пути нет кроме BackLink.

---

### Task 11: Отображение BDMV job в `/builds`

**Files:**
- Modify: `src/lib/builds/build-queue-display.ts` + test
- Modify: `src/lib/builds/build-detail-display.ts` + test
- Modify: `src/lib/builds/build-serialize.ts`
- Modify: `src/components/builds/BuildJobCard.tsx` / `BuildJobDetailClient.tsx` - лейбл источника

Правила текста:

- kind recipe: как сейчас
- kind bdmv: «BDMV → MKV», в деталях playlist basename и краткий состав (N аудио / M сабов), не «конфигурация из релизов»

Не писать «рецепт».

---

### Task 12: Rules + регрессия + самопроверка

**Files:** `.cursor/rules/01-architecture.mdc`, `02-data-model.mdc`, `03-api-routes.mdc`, `04-nextjs-ui.mdc` (empty-state + кнопка), `05-domain-pipelines.mdc` (скан skip + bdmv pipeline), `07-project-map.mdc`

- [ ] Таблица маршрутов: `/movies/[slug]/releases/from-bdmv`
- [ ] API таблица inspect/builds
- [ ] Поток BDMV рядом с потоком сборки релиза
- [ ] Movie: «может иметь 0 релизов; каталог прячет; фильтр emptyReleases»
- [ ] Lookup: `lib/media/bdmv/*`, `lib/builds/bdmv-*.ts`

Прогнать:

```
npm test
npm run typecheck
```

Ручной чеклист (браузер, если dev up):

1. `/movies/new` - нет поля файла, создать «Тест BDMV», попасть на empty-state, две кнопки.
2. Каталог `/` - карточки нет. Фильтр «Без релизов» - есть. Кликнули - та же страница.
3. На фильме с релизом меню содержит «Собрать из BDMV файлов».
4. Удалить единственный релиз (без удаления файла) - фильм жив, empty-state, каталог скрыл.
5. Скан папки, внутри которой BDMV/STREAM - эти m2ts не стали черновиками.
6. Мастер: выбрать `Foreigner Remux`, прочитать диск, основной плейлист, очередь, `/builds/[id]` идёт progress.
7. После SUCCEEDED - релиз на карточке, type BDRemux, каталог снова показывает фильм.
8. Reduced-motion / фокус Tab по кнопкам empty-state и мастера.

---

## Порядок коммитов (если попросят)

1. `feat: keep movies without releases and hide them in catalog`
2. `feat: remux BDMV playlists into MKV via mkvmerge queue`

Не мешать оба в один, если можно развести: Task 1-6 и Task 7-11.

---

## Что не делать

- Не писать свой muxer и не звать ffmpeg для копирования всего диска (потеря HDR/DV риск, медленнее).
- Не парсить каждый m2ts ffprobe-ом на inspect (минуты).
- Не открывать конструктор `/builds/new` без релизов.
- Не удалять Movie при last-release «на всякий случай».
- Не показывать пустые фильмы в обычной сетке «чтобы не потерялись» - для этого фильтр и прямой URL.
- Не добавлять ISO.
- Не вводить вторую очередь job.
- Не редизайнить каталог/шапку «под новый вайб».
