import { describe, expect, it } from "vitest";
import { layoutWatchTimeline } from "./watch-timeline-layout";

describe("watch timeline spacing", () => {
  it.each([358, 720, 1344, 1836, 2464, 3666])("keeps single and double viewing days apart at %ipx", width => {
    for (const counts of [[2, 1, 1], [1, 2, 2], [2, 2, 2], [2, 4, 1]]) {
      const { panels } = layoutWatchTimeline(counts.map(count => ({ count, gapDays: 1 })), 1, width, 650);
      expect(panels[1].x).toBe(0);
      expect(panels[1].left - panels[0].right).toBeCloseTo(panels[1].gapBefore);
      expect(panels[2].left - panels[1].right).toBeCloseTo(panels[2].gapBefore);
      expect(panels[1].gapBefore).toBeGreaterThanOrEqual(width < 768 ? 48 : 72);
    }
  });

  it("keeps the selected day centred at both ends of history", () => {
    for (const active of [0, 2]) {
      const { panels } = layoutWatchTimeline([1, 2, 1].map(count => ({ count, gapDays: 1 })), active, 1920, 700);
      expect(panels[active].left + panels[active].right).toBeCloseTo(0);
      expect(panels[1].left).toBeGreaterThan(panels[0].right);
      expect(panels[2].left).toBeGreaterThan(panels[1].right);
    }
  });

  it("limits the central scroll viewport to two posters and respects short windows", () => {
    const layout = layoutWatchTimeline([{ count: 4, gapDays: null }], 0, 1920, 300);
    expect(layout.panels[0].width).toBe(layout.cardWidth * 2 + layout.cardGap);
    expect(layout.cardWidth * 1.5 + 104).toBeLessThanOrEqual(300);
  });
  it("makes a fortnight clearly wider than one day at the same depth", () => {
    const { panels } = layoutWatchTimeline([{ count: 1, gapDays: null }, { count: 1, gapDays: 1 }, { count: 1, gapDays: 14 }], 1, 1920, 800);
    const shortGap = panels[1].left - panels[0].right;
    const longGap = panels[2].left - panels[1].right;
    expect(longGap / shortGap).toBeGreaterThanOrEqual(4);
  });

  it("makes longer breaks wider, while bounding very long gaps", () => {
    const gaps = [1, 2, 7, 30, 90, 3650].map(gapDays => {
      const { panels } = layoutWatchTimeline([{ count: 1, gapDays: null }, { count: 1, gapDays }], 0, 1920, 800);
      return panels[1].left - panels[0].right;
    });
    for (let i = 1; i < 5; i++) expect(gaps[i]).toBeGreaterThan(gaps[i - 1]);
    expect(gaps[5]).toBeCloseTo(gaps[4]);
    expect(gaps[4]).toBeLessThanOrEqual(420);
  });

  it.each([1344, 1836, 2464])("keeps five dense viewing days visible at %ipx", width => {
    const { panels, cardWidth } = layoutWatchTimeline(Array.from({ length: 7 }, () => ({ count: 2, gapDays: 3 })), 3, width, 800);
    for (const panel of panels.slice(1, 6)) {
      expect(panel.left).toBeLessThan(width / 2);
      expect(panel.right).toBeGreaterThan(-width / 2);
      if (width >= 1836) {
        expect(panel.left).toBeGreaterThanOrEqual(-width / 2);
        expect(panel.right).toBeLessThanOrEqual(width / 2);
      }
    }
    expect(cardWidth).toBeGreaterThanOrEqual(150);
  });
});
