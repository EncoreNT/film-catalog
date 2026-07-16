# Film Catalog

Домашний каталог фильмов на Next.js 16 + SQLite. Сканирует папку с видеофайлами, определяет технические параметры через ffprobe, позволяет вручную дополнять метаданные и обложки.

## Требования

- **Node.js** 20+
- **FFmpeg** с `ffprobe` и `ffmpeg` в PATH
- **MKVToolNix** с `mkvmerge` в PATH (для сборки пользовательских релизов)

```bash
# macOS
brew install ffmpeg mkvtoolnix
```

## Быстрый старт

```bash
npm install
npm run db:migrate
npm run dev
```

`npm run dev` запускает **web + worker сборок** (очередь MKV-релизов). Только UI:

```bash
npm run dev:web
```

Worker отдельно:

```bash
npm run worker:builds
```

> **Node 24 + worker:** если worker падает с `ERR_PACKAGE_PATH_NOT_EXPORTED` / `unicorn-magic`, выполните `npm install` — в `package.json` есть override `npm-run-path@5.3.0` для совместимости `tsx` + `execa`.

Откройте [http://localhost:3000](http://localhost:3000).

## Настройка папки сканирования

Два способа:

1. **Через UI** — страница «Скан» (`/scan`), укажите абсолютный путь к папке с фильмами.
2. **Через `.env`**:

```env
DATABASE_URL="file:./data/catalog.db"
SCAN_ROOT="/path/to/your/movies"
```

## Где хранятся данные

| Путь | Содержимое |
|------|------------|
| `./data/catalog.db` | SQLite база |
| `./data/covers/` | Обложки фильмов |

Папка `data/` в `.gitignore`.

## Возможности

- Рекурсивное сканирование видеофайлов (один файл = один релиз; фильм может иметь несколько релизов)
- Автоопределение: разрешение, кодек, HDR, FPS, битрейт видео, продолжительность
- Аудиодорожки: кодек (AC3/E-AC3/TrueHD/DTS…), профиль (Atmos/HD MA…), формат (2.0/5.1/7.1), битрейт, язык
- Субтитры: тип (SRT/ASS/PGS/VobSub…), язык, forced
- Жанры: несколько жанров на фильм, фильтр по жанрам в каталоге
- Черновики (Draft) → апрув в каталог
- Дедупликация: быстрая проверка size+mtime, хэш префикса при конфликте
- Личная оценка (1–10) и дата просмотра
- Франшизы: слоты, quality reel, completion meter, привязка фильмов
- Фильтры: жанр, разрешение, язык аудио, формат звука, оценка, просмотренность, сортировка по продолжительности
- Загрузка обложек локально (фильмы 2:3, франшизы 16:9)
- **Сборка релизов**: выбор дорожек из нескольких исходных Release, AC-3/E-AC3 transcode, фоновая очередь (`/builds`)
- UI: дизайн-система **Cinematic Tech** — см. [`docs/design-system.md`](docs/design-system.md)

### Сборка пользовательских MKV

- Конструктор: `/movies/[slug]/builds/new` — video copy, выбор audio/subtitle, опциональный transcode
- Очередь: `/builds` — статус, отмена, повтор
- Результат регистрируется как **новый Release** того же фильма; исходники не изменяются
- E-AC3/AC-3: пресеты битрейта, цель 2.0 или до 5.1 (7.1/Atmos downmix); Atmos в новой дорожке не сохраняется
- Совпадение длительности ≠ гарантия синхронизации; для audio copy доступен ручной сдвиг (мс)

## Скрипты

```bash
npm run dev          # web + worker сборок
npm run dev:web      # только Next.js
npm run worker:builds # worker очереди сборок
npm run build        # production build
npm run test         # vitest
npm run typecheck    # tsc --noEmit
npm run db:migrate   # миграции Prisma
npm run db:studio    # Prisma Studio
```

## Стек

- Next.js 16 (App Router)
- Prisma 7 + SQLite (better-sqlite3 adapter)
- Tailwind CSS v4
- ffprobe (execa)
- zod, lucide-react, motion
