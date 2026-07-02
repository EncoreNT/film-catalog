# AGENTS.md — Film Catalog

Домашний каталог фильмов на Next.js 16 + SQLite. Подробные спеки для AI — в **`.cursor/rules/`**.

## Быстрый старт

```bash
npm install && npm run db:migrate && npm run dev
```

Требования: Node 20+, ffprobe в PATH. Данные: `data/catalog.db`, `data/covers/`.

## Документация для моделей

| Rule | Когда читать |
|------|--------------|
| [`00-project-overview`](.cursor/rules/00-project-overview.mdc) | Всегда — стек, команды, язык UI |
| [`01-architecture`](.cursor/rules/01-architecture.mdc) | Всегда — структура, слои, маршруты, потоки данных |
| [`02-data-model`](.cursor/rules/02-data-model.mdc) | Prisma, lib — сущности, связи, zod |
| [`03-api-routes`](.cursor/rules/03-api-routes.mdc) | `src/app/api/**` |
| [`04-nextjs-ui`](.cursor/rules/04-nextjs-ui.mdc) | Pages, components, дизайн-система |
| [`05-domain-pipelines`](.cursor/rules/05-domain-pipelines.mdc) | scanner, ffprobe, фильтры, обложки |
| [`06-engineering-standards`](.cursor/rules/06-engineering-standards.mdc) | **Всегда** — ADR, тесты, слои, reuse, БД |

**Перед ресерчем кодовой базы** — открыть релевантные rules.

## ADR

Архитектурные решения — [`docs/adr/`](docs/adr/README.md). Шаблон и правила в README.

## Next.js 16

Breaking changes относительно training data. Перед правками App Router читать `node_modules/next/dist/docs/`. `params` / `searchParams` — Promise.

## Человеческая документация

[`README.md`](README.md) — установка, SCAN_ROOT, возможности.
