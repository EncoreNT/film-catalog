"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { SpotlightTarget } from "@/components/layout/SpotlightTarget";

export function MovieBillboard({ poster, summary, children }: {
  poster: ReactNode;
  summary: ReactNode;
  children: ReactNode;
}) {
  const columnRef = useRef<HTMLDivElement>(null);
  const summaryRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const column = columnRef.current;
    const summary = summaryRef.current;
    if (!column || !summary) return;
    const picker = column.querySelector<HTMLElement>(".movie-release-bar");
    const measure = () => {
      const barHeight = picker?.offsetHeight ?? 0;
      const summaryHeight = summary.offsetHeight;
      // Reserve space for the section tabs and several rows of tracks.
      const pin = window.innerWidth > 1030 && summaryHeight + barHeight < window.innerHeight * 0.62;
      column.toggleAttribute("data-pin-summary", pin);
      column.style.setProperty("--movie-summary-height", pin ? `${summaryHeight}px` : "0px");
      column.style.setProperty("--movie-picker-height", `${barHeight}px`);
    };
    const anchor = column.querySelector(".movie-summary-anchor");
    const pinObserver = new IntersectionObserver(([entry]) => {
      column.toggleAttribute("data-scrolled", entry.boundingClientRect.top < 0 && !entry.isIntersecting);
    });
    if (anchor) pinObserver.observe(anchor);
    const observer = new ResizeObserver(measure);
    observer.observe(summary);
    if (picker) observer.observe(picker);
    measure();
    window.addEventListener("resize", measure);
    return () => {
      observer.disconnect();
      pinObserver.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [children]);

  return (
    <div className="movie-billboard">
      <SpotlightTarget side="left" className="movie-poster-column">{poster}</SpotlightTarget>
      <div className="movie-film-column" ref={columnRef}>
        <span className="movie-summary-anchor" aria-hidden />
        <div className="movie-summary" ref={summaryRef}>{summary}</div>
        <SpotlightTarget side="right" className="movie-editions">{children}</SpotlightTarget>
      </div>
    </div>
  );
}
