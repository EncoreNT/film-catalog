# Architecture Decision Records (ADR)

Краткие записи о значимых архитектурных решениях. Читаются людьми и AI без археологии в git history.

## Когда создавать

- Новая доменная сущность или изменение связей
- Выбор между альтернативами (cache, slug, scan strategy, …)
- Осознанный компромисс (denormalization, full replace vs patch)

Не нужен ADR для: bugfix, rename, стили, тривиальный рефактор.

## Именование

```
docs/adr/0001-short-kebab-title.md
docs/adr/0002-franchise-slots-model.md
```

Номер — 4 цифры, по возрастанию. Файлы immutable после Accepted (новое решение → новый ADR + Superseded).

## Шаблон

```markdown
# ADR-NNNN: Заголовок

- **Status:** Proposed | Accepted | Superseded by ADR-XXXX
- **Date:** YYYY-MM-DD

## Context

Какая проблема или ограничение? Какие варианты рассматривались?

## Decision

Что выбрали и почему (1–3 абзаца).

## Consequences

**Плюсы:** …

**Минусы / trade-offs:** …

**Follow-ups:** миграции, rules, тесты — что ещё сделать.
```

## Индекс

| ADR | Title | Status |
|-----|-------|--------|
| [0001](0001-movie-release-split.md) | Movie / Release split | Accepted |
| [0002](0002-external-storage-only.md) | External storage only (null = local disk) | Accepted |
| [0003](0003-lib-components-domain-layout.md) | Domain layout for `lib/` and `components/` | Accepted |
| [0004](0004-cinematic-tech-design-system.md) | Cinematic Tech design system | Accepted |
| [0005](0005-tier-driven-spotlight.md) | Tier-driven ambient spotlight | Accepted |
| [0006](0006-durable-release-build-worker.md) | Durable release build worker | Accepted |
| [0007](0007-tv-export-and-runtime-paths.md) | TV export and runtime paths | Accepted |
| [0008](0008-release-move-job-queue.md) | Release move job queue | Accepted |
| [0009](0009-tier-classification-model.md) | Tier classification (ruby/gold/standard) | Accepted |
| [0010](0010-unified-media-jobs-worker.md) | Unified media jobs worker | Accepted |
| [0011](0011-franchise-slot-full-replace-sync.md) | Franchise slot full-replace sync | Accepted |
| [0012](0012-scan-hash-prefix-move-detection.md) | Scan hash prefix + move detection | Accepted |

После Accepted — при необходимости обновить `.cursor/rules/` (особенно `01-architecture`, `02-data-model`).
