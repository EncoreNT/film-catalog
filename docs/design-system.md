# Дизайн-система «Кинозал» — Cinematic Tech

Подробный гайд по визуальному языку проекта. Единственный источник правды для
токенов — `src/app/globals.css` (`:root` + `@theme inline`). Этот документ
фиксирует **что**, **почему** и **как применять**; конкретные значения всегда
сверяй с `globals.css`.

- ADR решения: [`docs/adr/0004-cinematic-tech-design-system.md`](adr/0004-cinematic-tech-design-system.md)
- Краткая AI-спека: [`.cursor/rules/04-nextjs-ui.mdc`](../.cursor/rules/04-nextjs-ui.mdc)
- Архитектура компонентов: [`.cursor/rules/01-architecture.mdc`](../.cursor/rules/01-architecture.mdc)

---

## 1. Идея языка

**Cinematic Tech** (внутреннее имя — *neurox-tier*): интерфейс читается как
постапокалиптический projection-room console — тёмная машинная стеклянная
обшивка, в которую врезаны «приборные плашки» тех-спецификаций, подсвеченные
проекторным лучом. Два слоя смысла накладываются:

- **Кинематограф** — тёплое золото проекторного луча, ember-тёплый противовес,
  плёночная перфорация, god-ray, anamorphic lens flare, «постер в алюминиевом
  подносе».
- **Tech / neural** — холодная neural-violet и cyan-лазерная сетка, сканирующие
  линии, holographic foil, дрейфующие туманности, моно-тех-метки.

Иерархия держится на **tier-системе** (Ruby > Gold > обычный) — это центральный
сигнал «насколько премиальный релиз», отдельный от разрешения.

Принципы:

1. **Токены, не hex.** Все цвета — CSS-переменные из `:root`, проброшенные в
   Tailwind через `@theme inline`. Хардкод `#hex`/`rgba()` только внутри
   `globals.css` для сложных составных эффектов.
2. **Двойной bezel.** Карточки — это «поднос + стеклянная пластина»: внешний
   полупрозрачный поднос + внутренний machined-керн. Не плоская заливка.
3. **Свет концентрированный, не диффузный.** Свечения — это горячие точки
   (`.glow-hotspot`, `blur(70px)`), не ровный матовый фон.
4. **Motion осмысленный.** Каждый эффект привязан к состоянию (hover, entrance,
   loading, tier). Постоянные анимации только ambient-фона и holo/lens на
   премиум-плашках. Всё гасится в `prefers-reduced-motion`.
5. **Reuse primer.** Перед новым компонентом — смотри `components/primitives/`.
   Не дублировать Button/Modal/card-оболочку.

---

## 2. Foundations

### 2.1 Палитра

Фон — **cool coal**, не pure black и не warm brown: слегка холодный, чтобы
neural-violet tech-glow читался на нём, а золото держало тепло проектора.

#### Surfaces

| Token | Значение | Tailwind | Назначение |
|-------|----------|----------|------------|
| `--bg-deep` | `#0b0a0f` | `bg-bg-deep` | Фон страницы (`body`), база ambient |
| `--bg-base` | `#121119` | `bg-bg-base` | Промежуточный фон |
| `--bg-elevated` | `#1a1822` | `bg-bg-elevated` | Solid-поверхности: инпуты, дропдауны, внутренние керны, меню |
| `--bg-surface` | `rgba(170,162,210,0.13)` | `bg-bg-surface` | Glass-карточки (`.surface-card`), alpha 0.13 чтобы не растворялись в ambient |
| `--bg-surface-hover` | `rgba(170,162,210,0.17)` | `bg-bg-surface-hover` | Hover glass-карточек |
| `--bg-glass` | `rgba(20,18,28,0.62)` | `bg-bg-glass` | Премиум glass (`.surface-glass`, pills, sticky-deck) |

> Alpha у `--bg-surface`/`--bg-surface-hover` намеренно поднята с 0.05/0.09 до
> 0.13/0.17 — иначе glass-карточки растворяются в ambient-фоне.

#### Hairlines / borders

| Token | Значение | Tailwind | Назначение |
|-------|----------|----------|------------|
| `--border-hairline` | `rgba(176,168,214,0.10)` | `border-border` | Тонкая разделительная (дефолт у `surface-card`/`surface-elevated`) |
| `--border-strong` | `rgba(176,168,214,0.20)` | `border-border-strong` | Видимая граница карточек/инпутов, machined-поднос |
| `--border-neural` | `rgba(139,92,246,0.32)` | `border-border-neural` | Neural-акцентная граница |

#### Text

| Token | Значение | Tailwind | Назначение |
|-------|----------|----------|------------|
| `--text-primary` | `#f3f1f7` | `text-text` | Основной текст, cool-white |
| `--text-muted` | `#a39fb2` | `text-muted` | Вторичный, лейблы, хинты |
| `--text-faint` | `#645f76` | `text-faint` | Третичный, mono-метки дорожек, placeholder-подсказки |

#### Accents

| Token | Значение | Tailwind | Роль |
|-------|----------|----------|------|
| `--accent` | `#e8b05a` | `text-accent` / `bg-accent` | **Gold** — первичный акцент, проекторный луч, активные состояния, 4K |
| `--accent-bright` | `#f6c878` | `text-accent-bright` | Светлее золото (gradient-концы, яркие числами) |
| `--accent-glow` | `rgba(232,176,90,0.26)` | `shadow-[0_0_…var(--accent-glow)]` | Glow-тень для золота |
| `--accent-soft` | `rgba(232,176,90,0.10)` | `bg-accent-soft` | Очень бледная gold-подложка |
| `--neural` | `#8b5cf6` | `text-neural` | **Neural violet** — AI/tech вторичный, neural-pulse dot |
| `--neural-bright` | `#a78bfa` | `text-neural-bright` | Светлее violet (gradient-концы) |
| `--neural-glow` | `rgba(139,92,246,0.28)` | — | Glow-тень |
| `--neural-soft` | `rgba(139,92,246,0.10)` | `bg-neural-soft` | Бледная violet-подложка |
| `--cyan` | `#38bdf8` | `text-cyan` | **Cyan** — laser/scan highlight, lens flare |
| `--cyan-bright` | `#7dd3fc` | `text-cyan-bright` | Светлее cyan |
| `--cyan-glow` | `rgba(56,189,248,0.22)` | — | Glow-тень |
| `--crimson` | `#c43d5a` | `text-crimson` | **Crimson** — ruby tier (топовый релиз). Чуть десатурирован чтобы не читался как danger-red |
| `--crimson-bright` | `#f06880` | `text-crimson-bright` | Светлее crimson |
| `--crimson-glow` | `rgba(196,61,90,0.34)` | — | Glow-тень |
| `--crimson-soft` | `rgba(196,61,90,0.10)` | `bg-crimson-soft` | Бледная crimson-подложка |
| `--ember` | `#c87038` | `text-ember` | **Ember** — тёплый противовес золота (ambient, laser-градиент) |
| `--ember-bright` | `#e08a4e` | `text-ember-bright` | Светлее ember |
| `--ember-glow` | `rgba(200,112,56,0.18)` | — | Glow-тень |
| `--danger` | `#f87171` | `text-danger` / `bg-danger/10` | Ошибки, удаление (`Button variant="danger"`) |
| `--success` | `#5eead4` | `text-success` | Успех (редко) |

**Иерархия акцентов:** gold = первичный (повсеместно), neural = tech-вторичный,
cyan = laser-highlight, **crimson = только Ruby tier** (не использовать для
ошибок или декора), ember = тёплый балансир в ambient/laser-градиентах.

### 2.2 Типографика

Шрифты подключены в `src/app/layout.tsx` через `next/font/google` и проброшены
как CSS-переменные + `@theme inline` (`--font-display`, `--font-mono`, `--font-ui`).

| Семейство | Переменная | Tailwind | Роль |
|-----------|-----------|----------|------|
| **Fraunces** | `--font-fraunces` | `font-display` | Display-заголовки (serif, optical-sizing) — названия фильмов, заголовки карточек, H1 |
| **Manrope** | `--font-manrope` | `font-ui` / дефолт body | UI/body, кириллица. `body` + `font-feature-settings: "ss01","cv11"` |
| **JetBrains Mono** | `--font-jetbrains` | `font-mono` | Моно-тех-метки |

Семантические классы меток (в `globals.css`):

| Класс | Шрифт | Размер | Tracking | Transform | Назначение |
|-------|-------|--------|----------|-----------|------------|
| `.font-display` | Fraunces | inherit | — | — | Заголовки |
| `.font-mono-tech` | JetBrains Mono | `0.7rem` | `0.08em` | uppercase | Тех-метки: eyebrow, лейблы дорожек, тир-теги, табы |
| `.font-micro` | JetBrains Mono | `0.6rem` | `0.08em` | uppercase | Суб-лейблы в плотных панелях («тип озвучки», «каналы») |

> `Manrope` — это **не** Inter. Прежняя версия этого гайда упоминала Inter —
> устарело. Все кириллические тексты рендерятся Manrope.

### 2.3 Радиусы, easing, контейнер, брейкпоинты

| Token | Значение | Назначение |
|-------|----------|------------|
| `--radius` | `16px` | Карточки, инпуты, кнопки, плашки (через `rounded-[var(--radius)]`) |
| `--radius-sm` | `10px` | Мелкие элементы, таб-контейнеры |
| `--radius-pill` | `999px` | Пилюли, чипы, glass-табы |
| `--ease` | `cubic-bezier(0.16, 1, 0.3, 1)` | Основной easing (декелерация, «кинофокус») |
| `--ease-tech` | `cubic-bezier(0.32, 0.72, 0, 1)` | Tech-easing для лазер/scan-анимаций |
| `--container-max` | `2400px` | `container-wide` — максимальная ширина контента |

Брейкпоинты (Tailwind v4 `@theme inline`): `--breakpoint-3xl: 120rem`,
`--breakpoint-4xl: 160rem` — для очень широких экранов каталога.

> `--radius` = **16px**, не 14px. Прежняя спека устарела. Вложенный керн
> double-bezel использует `calc(var(--radius) - 0.5rem)` или
> `calc(16px - 0.375rem)`.

---

## 3. Surfaces & cards

### 3.1 Базовые поверхности

| Класс | Внешний вид | Когда |
|-------|-------------|-------|
| `.surface-card` | Glass: `--bg-surface` + hairline + `blur(12px) saturate(140%)` + inset-top-highlight | Контентные карточки общего назначения |
| `.surface-elevated` | Solid: `--bg-elevated` + hairline + inset-highlight | Внутренние блоки внутри карточек (дорожки, видео-блок), инпуты-области, вложенные панели |
| `.surface-glass` | Premium glass: `--bg-glass` + `border-strong` + `blur(20px) saturate(160%)` + drop-shadow | Премиум-пилюли, sticky-deck, модалки |

### 3.2 Double-bezel «machined card»

Главный карточный язык — **поднос + стеклянная пластина**. Две реализации:

**Плашки (`ReleaseSpecHero`)** — полный cinematic: внешний поднос
`bg-bg-elevated/50` + `gradient-border-cinematic` (анимированная рамка) +
внутренний керн `.spec-plaque-core` + holo-foil + lens-flare + staggered
entrance. Применяется ТОЛЬКО к премиум-приборным плашкам спецификаций.

**Форм-карточки (`MachinedCard`)** — спокойный double-bezel для рабочих форм
(редактор релиза, и т.п.): внешний поднос `bg-bg-elevated/50` +
`gradient-hairline` (статичная рамка, без анимации) + внутренний керн
`.spec-plaque-core`. **Без `overflow-hidden`** — чтобы дропдауны `Select`
не обрезались. Заголовок секции — через `CardSectionHeader` (mono-tech
gold-метка + display-заголовок).

`spec-plaque-core` — переиспользуемый «machined glass» керн:
`linear-gradient(180deg, rgba(26,24,34,0.62) → rgba(13,12,20,0.78))` +
`inset 0 1px 0 rgba(255,255,255,0.06)` (top highlight) +
`inset 0 0 0 1px rgba(176,168,214,0.06)` (hairline frame). Полупрозрачный,
чтобы holo/laser-слои за ним читались как лёгкая иридесценция.

### 3.3 Poster frame

`.poster-frame` — двойной bezel для постера на detail-странице: внешний поднос
`rgba(20,18,28,0.55)` + `border-strong` + top-edge hairline-glow
(gold→neural) + hover gold-glow. Внутренняя пластина `.poster-frame-inner`
(`calc(var(--radius) - 0.5rem)`). Постер читается как физический machined
объект в алюминиевом подносе.

### 3.4 Glass frame

`.glass-frame` — neurox glass: `rgba(20,18,28,0.42)` + `blur(14px)
saturate(150%)` + inset-highlight + inset-hairline. `.glass-frame-top-glow`
добавляет 1px gold→neural top-edge через `::before`.

### 3.5 Catalog sticky deck

`.catalog-sticky-deck--active` — glass-фрейм тулбара каталога при скролле:
`blur(28px) saturate(200%) brightness(0.84)` + двойная inset-тень + top-edge
gradient-line (gold→white→neural) через `::after`. Тяжёлая glassmorphism для
«прилипшей» панели.

---

## 4. Cinematic effects (flourish layer)

Все эффекты — в `globals.css`, секция «Cinematic-tech flourish layer». Это то,
что делает интерфейс «живым».

### 4.1 Градиентные рамки

| Класс | Поведение | Когда |
|-------|-----------|-------|
| `.gradient-border-cinematic` | `::before` 1px рамка, `linear-gradient(120deg, gold→neural→cyan→gold)`, `background-size:300%`, `border-shimmer` 6s, opacity 0.55 → 1 on hover | Премиум-плашки, акцентные карточки. **Анимированная** |
| `.gradient-hairline` | `::before` 1px статичная рамка `linear-gradient(140deg, gold→neural→cyan)`, без анимации | Рабочие форм-карточки (`MachinedCard`), rest-state framing |
| `.gradient-border-ruby::before` | Переопределяет градиент на crimson-metal | Ruby-tier карточки |

Техника: `padding:1px` + `-webkit-mask` (content-box xor padding-box) рисует
только 1px-кольцо. Нужен `position: relative` + `border-radius` на элементе.

### 4.2 Sheen / holo / lens / beam

| Класс | Что | Триггер |
|-------|-----|---------|
| `.sheen-layer` (+ `::after`) | Диагональный световой проход через элемент | `sheen-pass 0.9s` on `.group/laser:hover` / `.group:hover` |
| `.holo-foil` | Conic-gradient иридесценция (gold/violet/cyan/pink), `holo-shift` 8s hue-rotate | rest, очень subtle |
| `.holo-gold` / `.holo-ruby` | Tier-голограммы (warm gold / deep crimson) | rest iridescence tier-карточек |
| `.lens-flare` | Горизонтальный anamorphic blue streak + drift 11s | премиум-плашки |
| `.projector-beam` | Мягкий диагональный god-ray сверху (gold, `blur(8px)`) | ambient + hero |
| `.glow-hotspot` | База для концентрированных glow-пятен (`border-radius:999px; filter:blur(70px)`) | ambient blobs |

### 4.3 Laser traces (SVG)

`LaserCardFrame` — компонент-оболочка каталожной карточки с SVG-лазерным
периметром. На hover по `group/laser`:

- `.laser-trace` — gold-головка обегает периметр (`laser-perimeter 1.6s`,
  `stroke-dasharray:0.12 0.88`).
- `.laser-trace-cyan` — cyan-контр-лазер в обратную сторону, со сдвигом 0.12s
  (`laser-perimeter-rev 2.1s`).
- `.laser-trace--delayed` — второй проход с задержкой 0.15s (для tier-карточек).
- `.laser-scan-line` — idle scan-линия калибровки проектора (`laser-scan-sweep 6s`).
- `.laser-rest-outline` — постоянная rest-state обводка, гаснет на hover
  (0.85 → 0).

Tier меняет stroke-градиент: `ruby` → crimson, `gold` → ember+gold, `null` →
gold. Rest-state **без** внешней рамки (избегаем `-inset-px` артефакта
«sticks» на rounded-углах) — tier-сигнал в покое несёт poster inset-ring +
outer glow (см. MovieCard), а SVG-laser только на hover.

### 4.4 Glow-тени (явные классы)

Tailwind v4 в этом проекте **ненадёжно** генерирует arbitrary `box-shadow` с
`var()`/`rgba()`/`#hex`, поэтому glow-тени — отдельные классы в `globals.css`.
Hover-эскалация через `.group/laser` parent-selector.

| Группа | Классы | Назначение |
|--------|--------|------------|
| Gold | `.glow-accent-{8,10,12,14,16,18,22,26,28,32,36,40,44,48}` | Размер glow в px |
| Neural | `.glow-neural-{8,10,12,14,16,22,28,32}` | Violet glow |
| Cyan | `.glow-cyan-{12,14}` | Laser glow |
| Crimson | `.glow-crimson-{12,16,22}` | Ruby glow |
| Ember | `.glow-ember-{12,24,40}` | Тёплый glow |
| Dual | `.glow-dual-{18-28,26-20,28-22,30-22,32-22,44-32}` | accent+neural комбо |
| Inset | `.glow-inset-hairline`, `.glow-inset-hairline-acc[-s]`, `.glow-inset-neural`, `.glow-inset-top-accent` | Внутренние 1px-рамки |
| Poster | `.glow-poster-rest`, `.glow-poster-hover`, `.glow-poster-elite-rest`, `.glow-poster-elite-hover` | Постер rest/hover |
| Card elevation | `.glow-card-rest`, `.glow-card-gold`, `.glow-card-ruby` (+ `.group:hover` эскалация) | Внешняя тень карточки по tier |
| Bezel | `.glow-bezel`, `.glow-bezel-elite`, `.glow-bezel-gold`, `.glow-bezel-ruby` | Bezel-эскалация |
| Corner | `.glow-corner-accent`, `.glow-corner-neural` | Угловые скобки на hover |

### 4.5 Drop-glow (для иконок/текста)

`.drop-glow-accent[-lg|-xl]`, `.drop-glow-neural[-lg]`, `.drop-glow-crimson[-lg]`
— `filter: drop-shadow(...)`. `drop-glow-accent-xl` — самый сильный, для 4K-
нумерала на плашке.

### 4.6 Текстовые эффекты

- `.text-gradient-cinematic` — gold→neural gradient-text (`background-clip:text`),
  использовать **очень редко** (hero/feature заголовки).
- `.error-code-glow` — многослойный text-shadow для большого error-кода
  (projector beam по цифрам).

---

## 5. Ambient layer

`AmbientBackground` (`src/components/layout/AmbientBackground.tsx`) — фиксированный
`pointer-events-none z-0` слой под контентом. Слои (снизу вверх):

1. **Cool coal base** — `radial-gradient(ellipse 130% 95% at 50% 8%, #1f1830 → #15121f → #0c0a12 → #07060a)`.
2. **Tech grid** — `.tech-grid` (violet 56px grid, radial-mask fade). Плюс
   inline fine gold-grid 14px, masked к верху.
3. **Projector god-ray** — `.projector-beam` сверху-центр, поворот 5°.
4. **Gold hotspot** — `ambient-blob-1` сверху-центр (`drift-slow 18s`).
5. **Ember counter** — `ambient-blob-2` снизу-центр (`drift-slower 24s`) +
   центральный ember-hotspot.
6. **Neural nebula** — `ambient-blob-neural` справа-середина (`drift-neural 28s`).

`GrainOverlay` — плёночное зерно поверх. `SiteHeader` — отдельный layout-
компонент шапки.

Дополнительные текстуры:

| Класс | Что |
|-------|-----|
| `.tech-grid` | Violet 56px сетка, radial-mask |
| `.tech-grid-fine` | Cyan 14px сетка |
| `.film-perfs` | Горизонтальная плёночная перфорация (sprocket holes) |
| `.film-perfs-y` | Вертикальная перфорация |

Ambient-анимации (`drift-slow/slower/neural`) — **постоянные**, гасятся в
`prefers-reduced-motion`.

---

## 6. Tier system (Ruby / Gold)

Центральный сигнал «премиальности релиза», **отдельный от разрешения**.

### 6.1 Логика

`ReleaseTier = "ruby" | "gold" | null` (`src/lib/media/release-tags.ts`).
`releaseTier(release)`:

```
if не 4K или не любой HDR → null
bestRusDub = лучшая русская дубляжная дорожка (Atmos > каналы > isDefault)
if bestRusDub.profile === "Atmos" && channels >= 8 → "ruby"
main = mainAudioTrack(release)
if main channels >= 6 → "gold"
иначе → null
```

- **Ruby** = 4K + любой HDR + Atmos ≥ 7.1 на лучшем русском дубляже.
- **Gold** = 4K + любой HDR + surround ≥ 5.1 (6+ каналов) на основной дорожке.
- Ruby имеет приоритет над Gold. Atmos-оригинал при русском AC3-дубляже **не
  даёт** ruby (нужен именно дубляж).

Ribbon-метки (`catalogTierRibbon`): Ruby → `4K | HDR | ATMOS`, Gold → `4K | HDR`.

### 6.2 Визуальный язык tier

| Сигнал | Ruby | Gold | Обычный |
|--------|------|------|---------|
| Outer card glow (rest) | `.glow-card-ruby` (crimson, ярче/шире/насыщеннее) | `.glow-card-gold` (warm) | `.glow-card-rest` (чёрная тень) |
| Top laser-line | `.tier-laser-top-ruby` | `.tier-laser-top-gold` | — |
| Poster inset ring | `.glow-poster-ruby-rest` | `.glow-poster-gold-rest` | `.glow-poster-rest` |
| Bezel hover | `.glow-bezel-ruby` | `.glow-bezel-gold` | `.glow-bezel` |
| Holo | `.holo-ruby` | `.holo-gold` | `.holo-foil` |
| Border | `.gradient-border-ruby` | `.gradient-border-cinematic` | — |

**Иерархия читается: ruby (deep crimson brilliance) > gold (warm) > rest.**
Crimson glow намеренно ярче/насыщеннее gold — «jewel in a dark setting»,
сигнал топ-тира, который старая серебряная treatment не давала.

`.tier-laser-top` — тонкая полупрозрачная gradient-линия на top-edge карточки
(`left:6% right:6% height:1.5px`, opacity 0.35 → 0.95/1 on hover). Это
**первичный** tier-сигнал в покое (заменил тяжёлый inset-ring).

### 6.3 Tier на табах релизов

`MovieReleasePanel` красит таб активного релиза по tier: текст, sliding-
underline-градиент, glow и тир-тег (`RUBY`/`GOLD`) берут цвет тира. На
**неактивных** табах tier-цвет блёклый (`text-crimson/55`, `text-accent/55`),
на hover bright до полного tier-цвета. Один релиз — тот же визуал, что
активный таб при нескольких.

### 6.4 Resolution accent scale (на плашке)

`ReleaseSpecHero` масштабирует акцент разрешения, **не** tier:

| Разрешение | Accent | Визуал |
|-----------|--------|--------|
| 4K | `gold` | `text-4xl sm:text-5xl font-bold`, `text-accent-bright`, `drop-glow-accent-xl`, gold-halo (`bg-accent/30 blur-2xl`) за нумералом, holo-foil + lens-flare |
| 1080p | `muted` | `text-3xl sm:text-4xl font-semibold`, `text-accent/80` — calm, legible, **не** «disabled» |
| 720p / SD | `neutral` | `text-muted`, без glow/holo |

Long-form лейбл разрешения (`4K Ultra HD`, `Full HD`) живёт на плашке; из
блока тех-данных видео разрешение убрано. Tier живёт на табе, не на плашке.

---

## 7. Motion

### 7.1 Easing

`--ease` (основной, декелерация) и `--ease-tech` (tech). Подавляющее большинство
анимаций используют `--ease`.

### 7.2 Keyframes реестр

| Keyframe | Где | Назначение |
|----------|-----|------------|
| `drift-slow` / `drift-slower` / `drift-neural` | ambient blobs | Дрейф glow-пятен 18/24/28s |
| `border-shimmer` | `.gradient-border-cinematic` | Сдвиг gradient-position 6s |
| `sheen-pass` | `.sheen-layer::after` | Диагональный световой проход 0.9s on hover |
| `holo-shift` | `.holo-foil/-gold/-ruby` | `hue-rotate(0→40deg)` 8s |
| `flare-drift` | `.lens-flare` | Anamorphic streak drift 11s |
| `laser-perimeter` / `-rev` | `.laser-trace` / `-cyan` | SVG stroke-dashoffset обегание 1.6s / 2.1s on hover |
| `laser-scan-sweep` | `.laser-scan-line` | Idle scan-линия 6s |
| `neural-pulse` | `.neural-pulse` | Дыхание opacity 0.55↔1, 3.2s (tech-chips, active dots) |
| `scan-h` | hero/HUD strips | Горизонтальный scan |
| `confirm-in` | `.confirm-dialog[open]` | Entrance 0.18s (translateY+scale) |
| `movieCardIn` | MovieCard | Rise 12px |
| `error-scene-in` | `.error-scene-in` | Staggered focus-pull 0.6s (blur+translateY) |
| `lamp-flicker` | `.lamp-flicker` | Projector lamp flicker 4.5s (error pages) |
| `catalog-loading-sweep` / `-fade` | `.catalog-loading-bar` | Top gold sweep при filter/sort transition |
| `detail-reveal` | `.detail-reveal[-2|-3]` | Hero+console focus-pull 0.8s, staggered 0/0.09/0.18s |
| `spec-plaque-in` | `.spec-plaque-in[--1|--2|--3]` | Plaque entrance 0.6s, staggered 0.04/0.12/0.20s, **replays on release tab switch** (panel remounts via `key=release.id`) |

### 7.3 Motion library

`motion/react` используется для sliding-underline табов:
`motion.span layoutId="release-tab-underline"` (табы релизов) и
`layoutId="track-tab-underline"` (табы Видео/Аудио/Субтитры в редакторе).
Transition: `{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }` (тот же `--ease`).

### 7.4 Reduced motion

Глобальный блок `@media (prefers-reduced-motion: reduce)`:

- Все `animation/transition-duration` → `0.01ms`.
- `.catalog-loading-bar` → статичная full-width gold-полоса.
- `.laser-trace[-cyan]` → static, opacity 0.5, без dash.
- `.laser-scan-line` → opacity 0.
- `.lens-flare` → static opacity 0.3.
- `.neural-pulse` → static opacity 0.8.
- `.ambient-blob-*` → без анимации.

**Любой новый эффект должен иметь calm rest-state** и попадать под этот блок
(либо через универсальное правило, либо явным переопределением).

---

## 8. Component inventory

### 8.1 `components/primitives/` — UI-кирпичи

| Компонент | Назначение |
|-----------|------------|
| `Button` | `variant: primary/secondary/ghost/danger`, `loading`, `min-h-11`, `rounded-[var(--radius)]`, gold-glow на primary |
| `Field` | Текстовый инпут + label + hint |
| `Select` | Dropdown + label + hint, `preserveOrder`, `disabled` |
| `MultiSelect` | Множественный выбор |
| `Checkbox` / `Radio` | Controls |
| `SegmentedControl` | Сегментированный переключатель (storage, version) |
| `Chip` / `TagPill` | Бейджи/теги |
| `Modal` / `NativeDialog` / `ConfirmDialog` | Диалоги (`confirm-in` entrance) |
| `FormActionBar` | Sticky-низ формы (save/cancel/delete + dirty/error) |
| `FormError` | Блок ошибки |
| `Field`-смежные: `DurationInput`, `MeasureInput` (`BitrateInput`,`SizeInput`), `YearInput`, `HdrInput`, `DatePicker` | Специализированные инпуты |
| `InfoHint` / `HoverTooltip` | Тултипы («?») |
| `StarRating` | Рейтинг звёздами |
| `QualityGauge` | Гейдж качества |
| `PremiumBadge` | Премиум-бейдж |
| `CoverUpload` / `ImageCoverUpload` | Upload обложек (фильм 2:3) |
| `ApiCoverImage` | `<img>` на API URL с cache-bust `?v=updatedAt` |
| `BackLink` | Назад со стрелкой |
| `PageHeader` | eyebrow (mono-tech gold + neural-pulse dot) + display title + subtitle + actions |
| `EmptyState` | Пустое состояние |
| `Pagination` | Пагинация |
| `LaserCardFrame` | SVG-laser оболочка карточки (tier-aware) |
| `MachinedCard` + `CardSectionHeader` | Double-bezel форм-карточка + секционный заголовок |

### 8.2 `components/layout/`

| Компонент | Назначение |
|-----------|------------|
| `AmbientBackground` | Фиксированный ambient-слой (см. §5) |
| `GrainOverlay` | Плёночное зерно |
| `SiteHeader` | Шапка (Каталог / Франшизы / Скан) |
| `ErrorScene` | Переиспользуемый error UI (`error-scene-in`, `lamp-flicker`) |
| `EntityEditLayout` | Лейаут edit-страниц |
| `EditPageHeader` | Заголовок edit-страниц (обёртка над `PageHeader`) |

### 8.3 Доменные компоненты

| Папка | Что |
|-------|-----|
| `catalog/` | `MovieCatalog`, `FilterBar`, `EmptyCatalog` (client, URL searchParams) |
| `movies/` | `MovieCard` (+ `LaserCardFrame`, tier-glow), `MovieForm`, `AddMovieForm`, рейтинг, approve |
| `releases/` | `MovieReleasePanel` (табы+tier), `ReleasePanelContent`, `ReleaseSpecHero` (плашки), `ReleasePanelActions`, `MovieReleasePageHeader`, `ReleaseEditor` |
| `franchises/` | `FranchiseForm`, `FranchiseCard`, `FranchiseSlotsEditor`, cover upload, quality reel |
| `scan/` | `ScanProgressModal`, `DraftQueueGrid` (NDJSON stream) |
| `duplicates/` | `DuplicateGroupList` |
| `shared/` | `StoragePicker`, `TrackEditorSection`, `SpecTag`, `SpecTag`-смежные |

### 8.4 Ключевые композиты

- **`ReleaseSpecHero`** — приборные плашки (resolution / HDR / audio) с
  resolution-accent-scale, holo, lens-flare, staggered entrance.
- **`MovieCard` + `LaserCardFrame`** — каталожная карточка с tier-glow,
  laser-perimeter on hover, tier-laser-top.
- **`MovieReleasePanel`** — табы релизов с tier-цветом, sliding-underline,
  единый визуал для single/multi.
- **`TrackEditorSection`** — редактор дорожек (tabbed: Видео/Аудио/Субтитры,
  underline-табы; non-tabbed для формы фильма).
- **`MachinedCard` + `CardSectionHeader`** — форм-карточки редактора релиза.

---

## 9. Layout & spacing

- `container-wide` — `max-width: var(--container-max)` (2400px), `margin-inline:auto`.
- `main` (`layout.tsx`) — `px-6 pt-4 pb-8 lg:px-10 lg:pt-5 lg:pb-10 xl:px-14 2xl:px-20 3xl:px-24`, `relative z-10` над ambient.
- Страницы — `space-y-10` между секциями (detail/edit).

### Обложки — ориентация

| Тип | Aspect | Где |
|-----|--------|-----|
| **Фильм** | `aspect-[2/3]` | MovieCard, movie detail, `CoverUpload` |
| **Франшиза** | `aspect-[16/9]` | FranchiseCard, hero, `FranchiseCoverUpload` |

Всегда `object-cover`. Upload UI подсказывает нужное соотношение.

---

## 10. Forms

- **Карточки секций** — `MachinedCard` + `CardSectionHeader` (mono-tech gold
  label + display title). Не плоский `surface-card` для форм-секций.
- **Инпуты** — `bg-bg-elevated`, `border-border`/`border-danger/50` при ошибке,
  `focus-ring`, `min-h-11`, `rounded-[var(--radius)]`, `text-sm`.
- **Кнопки** — `Button` с variant; primary = gold + glow, secondary = glass +
  hairline, danger = `danger/10` + `danger/30` border.
- **Sticky action bar** — `FormActionBar` внизу формы (`bg-bg-deep/80
  backdrop-blur-xl`), save/cancel/delete + dirty/error state.
- **Спец-инпуты** — `DurationInput` (H:MM:SS), `MeasureInput` (kbps/Mbps
  toggle, WxH), `HdrInput` (SDR/HDR toggle + format + DV profile),
  `StoragePicker` (Локальный/Внешний).
- **Словари опций** — `src/lib/shared/dictionaries.ts` (кодеки, профили,
  каналы, языки, release types, версии).
- **Spec display logic** — `src/lib/media/spec-tags.ts`, `release-tags.ts`,
  `src/lib/shared/format.ts`.

### Вкладки в формах

`TrackEditorSection` (tabbed) — underline-табы на `border-b border-border`
делителе, активный = `text-accent` + `motion.span` sliding-underline (gold
gradient + glow), неактивный = `text-muted hover:text-text`. Тот же язык, что
табы релизов.

---

## 11. Accessibility

- **Focus ring** — `.focus-ring` (`outline: 2px solid var(--accent); offset:2px`)
  на всех интерактивных элементах. `.focus-ring-neural` — violet-вариант.
- **Reduced motion** — глобальный `@media (prefers-reduced-motion)` (см. §7.4).
  Каждый новый эффект должен иметь calm fallback.
- **ARIA-паттерны:**
  - Табы: `role="tablist"` / `role="tab"` (`aria-selected`, `aria-controls`) /
    `role="tabpanel"` (`aria-labelledby`). Sliding-underline `aria-hidden`.
  - `ConfirmDialog` — `confirm-dialog[open]` + `::backdrop` entrance.
  - Tier/laser/holo-декор — `aria-hidden`, `pointer-events-none`.
- **Контраст** — text на `--bg-deep` через `--text-primary` (#f3f1f7);
  muted (#a39fb2) для вторичного; faint (#645f76) только для моно-меток.
- **Кириллица** — Manrope/JetBrains Mono подключены с `subsets: ["latin","cyrillic"]`.

---

## 12. Do / Don't

**Do**

- Используй токены (`text-accent`, `bg-bg-elevated`, `border-border-strong`).
- Карточки форм — `MachinedCard` + `CardSectionHeader`; премиум-плашки —
  `ReleaseSpecHero`-язык (double-bezel + holo + lens).
- Tier-цвет (crimson/gold) — только для tier-сигналов; gold также первичный
  акцент.
- Glow-тени — явные классы (`.glow-accent-*`), не arbitrary Tailwind-shadow.
- Перед новым компонентом — grep `components/primitives/` и доменные.
- Каждый эффект → calm rest-state + reduced-motion fallback.

**Don't**

- Не хардкодь `#hex`/`rgba()` в компонентах — только в `globals.css`.
- Не используй crimson для ошибок/декора — это Ruby tier. Для ошибок — `--danger`.
- Не клонируй `Button`/`Modal`/card-оболочку с правками на 2 строки — расширь
  primitive.
- Не вешай `overflow-hidden` на карточку с `Select` — дропдаун обрежется.
  `MachinedCard` намеренно без `overflow-hidden`.
- Не делай constant-shimmer на рабочих форм-карточках — `gradient-hairline`
  (static), не `gradient-border-cinematic` (animated). Анимированная рамка —
  только для премиум-плашек/hero.
- Не дублируй zod-схемы и Prisma include-объекты — единый source of truth.
- Не добавляй legacy `@tailwind base/components/utilities` — только
  `@import "tailwindcss"` + `@theme inline`.

---

## 13. File map

| Что | Где |
|-----|-----|
| Токены + все классы/эффекты | `src/app/globals.css` |
| Шрифты + root layout | `src/app/layout.tsx` |
| Ambient-слой | `src/components/layout/AmbientBackground.tsx` |
| Primitives | `src/components/primitives/` |
| Плашки спецификаций | `src/components/releases/ReleaseSpecHero.tsx` |
| Табы релизов + tier-цвет | `src/components/releases/MovieReleasePanel.tsx` |
| Laser-оболочка карточки | `src/components/primitives/LaserCardFrame.tsx` |
| Machined form-card | `src/components/primitives/MachinedCard.tsx` |
| Tier-логика | `src/lib/media/release-tags.ts` (`releaseTier`, `ReleaseTier`) |
| Spec-теги/формат | `src/lib/media/spec-tags.ts`, `src/lib/shared/format.ts` |
| Словари опций | `src/lib/shared/dictionaries.ts` |
| `next/image` localPatterns | `next.config.ts` (`/api/covers/**`, franchise cover) |
