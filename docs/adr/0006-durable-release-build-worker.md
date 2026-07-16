# ADR-0006: Durable release build worker

- **Status:** Accepted
- **Date:** 2026-07-16

## Context

Пользователь хочет собирать «адекватные» MKV-релизы из существующих Release одного Movie:
выбрать нужные audio/subtitle tracks, иногда перекодировать audio (AC-3/E-AC3) и
смешивать video от одного релиза с audio от другого. Операции могут занимать часы;
закрытие браузера не должно прерывать job.

Текущий стек умеет только **читать** медиа (`ffprobe`, `mkvmerge -J`, `mkvextract`).
Долгие операции в Route Handler (как scan NDJSON) не подходят: нет durable state и
recovery после перезапуска процесса.

Рассматривались варианты:
1. **Долгий HTTP + NDJSON** — как scan; просто, но не переживает закрытие страницы.
2. **Worker внутри Next.js** — проще деплой, но hot reload и несколько инстансов дают
   дубли и плохую изоляцию.
3. **Отдельный worker + SQLite queue** — durable, recovery, один job одновременно.

## Decision

Выбран **отдельный worker-процесс** (`scripts/release-build-worker.ts`) с очередью в
SQLite (`ReleaseBuild` и связанные таблицы). Next.js только создаёт/читает jobs через API;
клиент опрашивает статус polling-ом.

**Mux:** `mkvmerge` для финального MKV (stream copy video, copy/transcode audio,
subtitles, chapters с video source). **Transcode:** только `ffmpeg` для AC-3/E-AC3
с пресетами bitrate и downmix 7.1→5.1 при необходимости.

**Синхронизация:** перед enqueue — fresh ffprobe; разница длительности с video source
> 1 с → предупреждение с обязательным `acknowledgeWarnings`; ручной `offsetMs` на audio.
Авто-alignment и trim не делаем.

**Output:** атомарная запись `.<name>.<jobId>.part.mkv` → rename; затем probe и
создание нового `Release` у того же Movie. Исходные Release не меняются.

**Recovery:** stale `RUNNING` после потери heartbeat переводится в retry; незавершённый
encode начинается заново; если финальный файл уже на диске — идемпотентная регистрация.

## Consequences

**Плюсы:**
- Jobs переживают перезапуск web и worker
- Чёткое разделение UI / API / encode pipeline
- MKV + mkvmerge сохраняет HDR/DV при copy

**Минусы / trade-offs:**
- Нужно запускать два процесса (web + worker) в dev и prod
- Concurrency 1 — очередь последовательная
- E-AC3 encoder FFmpeg не даёт 7.1/Atmos — только downmix до 5.1
- Совпадение длительности не гарантирует lip-sync

**Follow-ups:** миграция Prisma, `src/lib/builds/*`, API routes, UI `/builds` и
`/movies/[slug]/builds/new`, обновление `.cursor/rules/`.
