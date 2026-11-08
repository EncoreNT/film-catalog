import "@/components/calendar/watch-calendar.css";

export default function LoadingCalendar() {
  return <section className="watch-calendar-page" aria-busy="true" aria-label="Загрузка календаря">
    <div className="h-16 w-72 max-w-full rounded-lg bg-bg-surface" />
    <div className="h-11 w-full rounded-lg bg-bg-surface" />
    <div className="watch-calendar-board"><div className="grid min-h-96 flex-1 grid-cols-7 grid-rows-5" aria-hidden>
      {Array.from({ length: 35 }, (_, i) => <div key={i} className="border-r border-b border-border p-3"><div className="h-3 w-4 rounded bg-bg-surface" /></div>)}
    </div></div>
    <p className="text-xs text-muted" role="status">Загружаем календарь…</p>
  </section>;
}
