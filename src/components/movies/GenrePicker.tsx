"use client";

import {
  useEffect,
  useLayoutEffect,
  useId,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import {
  ArrowUpToLine,
  Check,
  GripVertical,
  Plus,
  Search,
  X,
} from "lucide-react";
import { displayGenreName } from "@/lib/shared/dictionaries";

import {
  genrePickerOptions,
  type GenrePickerSort,
  type GenrePopularity,
} from "@/lib/movies/genre-picker-options";

interface GenrePickerProps {
  popularity: GenrePopularity[];
  value: string[];
  onChange: (value: string[]) => void;
  id?: string;
}

/** The chooser is a native popover; the selected order remains independent of sorting. */
export function GenrePicker({
  value,
  onChange,
  popularity,
  id,
}: GenrePickerProps) {
  const generatedId = useId();
  const panelId = id ?? generatedId;
  const [open, setOpen] = useState(false);
  const [sort, setSort] = useState<GenrePickerSort>("alphabetical");
  const [query, setQuery] = useState("");
  const [dragged, setDragged] = useState<string | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const finishDrag = () => {
    setDragged(null);
    setDropIndex(null);
  };

  useEffect(() => {
    if (open && window.matchMedia("(pointer: fine)").matches)
      searchRef.current?.focus({ preventScroll: true });
  }, [open]);

  useLayoutEffect(() => {
    if (!open) return;
    const panel = panelRef.current;
    const root = rootRef.current;
    if (!panel || !root) return;
    const position = () => {
      const viewport = window.visualViewport;
      const top = (viewport?.offsetTop ?? 0) + 12;
      const left = (viewport?.offsetLeft ?? 0) + 12;
      const width = (viewport?.width ?? window.innerWidth) - 24;
      const height = (viewport?.height ?? window.innerHeight) - 24;
      panel.style.maxHeight = `${height}px`;
      panel.style.width = `${Math.min(800, width)}px`;
      const anchor = root
        .querySelector(".movie-genre-selection")!
        .getBoundingClientRect();
      const panelHeight = panel.offsetHeight;
      const below = top + height - anchor.bottom - 8;
      const above = anchor.top - top - 8;
      const idealTop =
        below < panelHeight && above > below
          ? anchor.top - panelHeight - 8
          : anchor.bottom + 8;
      panel.style.left = `${Math.max(left, Math.min(anchor.left, left + width - panel.offsetWidth))}px`;
      panel.style.top = `${Math.max(top, Math.min(idealTop, top + height - panelHeight))}px`;
      panel.dataset.positioned = "true";
    };
    position();
    // Keep layout reads batched, never put scroll coordinates in React state.
    let frame = 0;
    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(position);
    };
    window.addEventListener("resize", schedule);
    window.addEventListener("scroll", schedule, true);
    window.visualViewport?.addEventListener("resize", schedule);
    window.visualViewport?.addEventListener("scroll", schedule);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", schedule);
      window.removeEventListener("scroll", schedule, true);
      window.visualViewport?.removeEventListener("resize", schedule);
      window.visualViewport?.removeEventListener("scroll", schedule);
      delete panel.dataset.positioned;
    };
  }, [open]);

  const move = (from: number, to: number) => {
    if (from === to || from < 0 || to < 0 || to >= value.length) return;
    const next = [...value];
    const [genre] = next.splice(from, 1);
    next.splice(to, 0, genre);
    onChange(next);
    setAnnouncement(`${displayGenreName(genre)}: место ${to + 1}`);
  };
  const toggle = (genre: string) => {
    onChange(
      value.includes(genre)
        ? value.filter((item) => item !== genre)
        : [...value, genre],
    );
  };
  const close = () => {
    panelRef.current?.hidePopover();
    toggleRef.current?.focus({ preventScroll: true });
  };
  const filtered = genrePickerOptions(popularity, sort, query);
  const chooseGenre = (genre: string) => {
    const adding = !value.includes(genre);
    toggle(genre);
    setQuery("");
    setAnnouncement(
      `${displayGenreName(genre)}: ${adding ? "добавлен" : "убран"}`,
    );
    if (query && window.matchMedia("(pointer: fine)").matches)
      searchRef.current?.focus({ preventScroll: true });
  };

  return (
    <div
      ref={rootRef}
      className="movie-genre-editor"
      onKeyDown={(event) => {
        if (event.key === "Escape" && open) {
          event.stopPropagation();
          event.preventDefault();
          close();
        }
      }}
    >
      <div className="movie-editor-field-label" id={`${panelId}-label`}>
        Жанры
      </div>
      <ul
        className="movie-genre-selection"
        data-drag-active={dragged != null}
        aria-labelledby={`${panelId}-label`}
        onDragOver={(event) => {
          if (!dragged) return;
          event.preventDefault();
          event.dataTransfer.dropEffect = "move";
          if ((event.target as HTMLElement).closest(".movie-genre-add")) {
            setDropIndex(
              value.indexOf(dragged) === value.length - 1 ? null : value.length,
            );
          }
        }}
        onDrop={(event) => {
          event.preventDefault();
          if (dragged && dropIndex != null) {
            const from = value.indexOf(dragged);
            move(from, dropIndex > from ? dropIndex - 1 : dropIndex);
          }
          finishDrag();
        }}
        onDragLeave={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null))
            setDropIndex(null);
        }}
      >
        {value.map((genre, index) => (
          <li
            key={genre}
            className="movie-genre-tag"
            data-primary={index === 0}
            data-dragging={dragged === genre}
            data-drop-before={dropIndex === index}
            data-drop-after={
              index === value.length - 1 && dropIndex === value.length
            }
            draggable
            onDragStart={(event) => {
              setDragged(genre);
              setDropIndex(null);
              event.dataTransfer.setData("text/plain", genre);
              event.dataTransfer.effectAllowed = "move";
            }}
            onDragEnd={finishDrag}
            onDragOver={(event) => {
              if (!dragged) return;
              event.preventDefault();
              event.dataTransfer.dropEffect = "move";
              const bounds = event.currentTarget.getBoundingClientRect();
              const boundary =
                index +
                (event.clientX > bounds.left + bounds.width / 2 ? 1 : 0);
              const from = value.indexOf(dragged);
              setDropIndex(
                boundary === from || boundary === from + 1 ? null : boundary,
              );
            }}
          >
            <GripVertical className="movie-genre-grip" size={14} aria-hidden />
            <button
              type="button"
              className="movie-genre-order focus-ring"
              aria-label={
                index === 0
                  ? `${displayGenreName(genre)}: основной жанр`
                  : `Сделать основным: ${displayGenreName(genre)}`
              }
              title={
                index === 0
                  ? "Основной жанр. Alt + стрелки для перемещения"
                  : "Сделать основным. Alt + стрелки для перемещения"
              }
              onClick={() => move(index, 0)}
              onKeyDown={(event) => {
                if (
                  event.altKey &&
                  (event.key === "ArrowLeft" || event.key === "ArrowRight")
                ) {
                  event.preventDefault();
                  move(index, index + (event.key === "ArrowLeft" ? -1 : 1));
                }
              }}
            >
              {index === 0 ? (
                <Check size={13} aria-hidden />
              ) : (
                <ArrowUpToLine size={13} aria-hidden />
              )}
            </button>
            <span>{displayGenreName(genre)}</span>
            <button
              type="button"
              className="movie-genre-remove focus-ring"
              onClick={() => toggle(genre)}
              aria-label={`Убрать жанр «${displayGenreName(genre)}»`}
            >
              <X size={13} aria-hidden />
            </button>
          </li>
        ))}
        <li>
          <button
            ref={toggleRef}
            type="button"
            className="movie-genre-add focus-ring"
            aria-expanded={open}
            aria-controls={panelId}
            popoverTarget={panelId}
            aria-haspopup="dialog"
          >
            <Plus size={16} aria-hidden /> Добавить жанр
          </button>
        </li>
      </ul>
      {value.length > 0 && (
        <p className="movie-genre-hint" data-drag-active={dragged != null}>
          <GripVertical size={14} aria-hidden />
          {dragged
            ? `Перемещаем «${displayGenreName(dragged)}». Отпустите у золотой линии.`
            : "Первый жанр основной. Перетащите теги или нажмите стрелку на жанре."}
        </p>
      )}
      <span className="sr-only" role="status">
        {announcement}
      </span>
      <div
        ref={panelRef}
        id={panelId}
        popover="auto"
        role="dialog"
        aria-label="Выбор жанров"
        className="movie-genre-chooser"
        onToggle={(event) => {
          const shown = event.newState === "open";
          setOpen(shown);
          if (!shown) setQuery("");
        }}
      >
        <div className="movie-genre-panel-heading">
          <h2>Жанры фильма</h2>
          <span>Выбрано: {value.length}</span>
          <button
            type="button"
            className="focus-ring"
            aria-label="Закрыть выбор жанров"
            onClick={close}
          >
            <X size={18} aria-hidden />
          </button>
        </div>
        <div className="movie-genre-search">
          <Search size={18} aria-hidden />
          <input
            ref={searchRef}
            aria-label="Найти жанр"
            placeholder="Найти жанр…"
            autoComplete="off"
            spellCheck={false}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                if (filtered.length === 1 && !event.nativeEvent.isComposing)
                  chooseGenre(filtered[0].value);
              }
            }}
          />
          {query && (
            <button
              type="button"
              className="focus-ring"
              aria-label="Очистить поиск жанра"
              onClick={() => {
                setQuery("");
                searchRef.current?.focus();
              }}
            >
              <X size={16} aria-hidden />
            </button>
          )}
        </div>
        <div
          className="movie-genre-sort"
          role="group"
          aria-label="Сортировка жанров"
        >
          <button
            type="button"
            className="focus-ring"
            aria-pressed={sort === "alphabetical"}
            onClick={() => setSort("alphabetical")}
          >
            По алфавиту
          </button>
          <button
            type="button"
            className="focus-ring"
            aria-pressed={sort === "popular"}
            onClick={() => setSort("popular")}
          >
            По популярности
          </button>
        </div>
        <div
          className="movie-genre-options"
          style={
            {
              "--genre-rows-wide": Math.max(1, Math.ceil(filtered.length / 4)),
              "--genre-rows-medium": Math.max(
                1,
                Math.ceil(filtered.length / 3),
              ),
              "--genre-rows-narrow": Math.max(
                1,
                Math.ceil(filtered.length / 2),
              ),
            } as CSSProperties
          }
          role="group"
          aria-label="Доступные жанры"
        >
          {filtered.map((genre) => (
            <button
              key={genre.value}
              type="button"
              className="focus-ring"
              aria-label={genre.label}
              aria-pressed={value.includes(genre.value)}
              title={`${genre.label}: ${genre.count} в каталоге`}
              onClick={() => chooseGenre(genre.value)}
            >
              <span className="movie-genre-option-check" aria-hidden>
                {value.includes(genre.value) && <Check size={13} />}
              </span>
              <span className="movie-genre-option-label">{genre.label}</span>
              {sort === "popular" && (
                <span className="movie-genre-option-count" aria-hidden>
                  {genre.count}
                </span>
              )}
            </button>
          ))}
          {filtered.length === 0 && (
            <div className="movie-genre-empty">
              <p>Жанр не найден</p>
              <button
                type="button"
                className="focus-ring"
                onClick={() => {
                  setQuery("");
                  searchRef.current?.focus();
                }}
              >
                Показать все жанры
              </button>
            </div>
          )}
        </div>
        <div className="movie-genre-panel-footer">
          <p>
            {sort === "popular"
              ? "Числа показывают количество фильмов в каталоге."
              : "Можно выбрать несколько жанров."}
          </p>
          <button
            type="button"
            className="movie-genre-done focus-ring"
            onClick={close}
          >
            Готово
          </button>
        </div>
      </div>
    </div>
  );
}
