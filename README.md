# Film Catalog

Домашний каталог фильмов на Next.js 16 + SQLite. Сканирует папку с видеофайлами, определяет технические параметры через ffprobe, позволяет вручную дополнять метаданные и обложки.

## Требования

- **Node.js** 20+
- **FFmpeg** с `ffprobe` в PATH

```bash
# macOS
brew install ffmpeg
```

## Быстрый старт

```bash
npm install
npm run db:migrate
npm run dev
```

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
- UI: дизайн-система **Cinematic Tech** — см. [`docs/design-system.md`](docs/design-system.md)

## Скрипты

```bash
npm run dev          # dev-сервер
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
