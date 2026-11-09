const PERSPECTIVE = 1400;
type TimelineLayoutDay = { count: number; gapDays: number | null };

/** Give a fortnight roughly four times the space of one day, then taper long breaks. */
function intervalWidth(days: number, mobile: boolean) {
  const day = Math.max(1, Math.min(90, days));
  const minimum = mobile ? 48 : 72;
  const fortnight = mobile ? 144 : 300;
  const maximum = mobile ? 192 : 420;
  return day <= 14
    ? minimum + (fortnight - minimum) * (day - 1) / 13
    : fortnight + (maximum - fortnight) * Math.log(day / 14) / Math.log(90 / 14);
}

/** Space projected edges; on desktop fit two neighbours on each side of the selected day. */
export function layoutWatchTimeline(days: TimelineLayoutDay[], active: number, width: number, height: number) {
  const mobile = width < 768;
  const maximumCard = Math.max(1, Math.min(width * (mobile ? .32 : .18), (height - 104) * 2 / 3, 360));
  const cardGap = mobile ? 12 : Math.min(24, Math.max(12, width * .015));
  function arrange(cardWidth: number) {
    const panels = days.map((day, index) => {
      const offset = index - active;
      const distance = Math.abs(offset);
      const angle = -Math.sign(offset) * [0, 24, 42, 52][Math.min(3, distance)];
      const depth = [0, 380, 1000, 1600][Math.min(3, distance)];
      const panelWidth = Math.min(2, day.count) * cardWidth + (day.count > 1 ? cardGap : 0);
      const radians = angle * Math.PI / 180;
      const project = (x: number) => x * Math.cos(radians) * PERSPECTIVE / (PERSPECTIVE + depth + x * Math.sin(radians));
      const pairDistance = Math.max(distance, Math.abs(offset - 1));
      const gapBefore = intervalWidth(day.gapDays ?? 1, mobile) * (pairDistance > 1 ? .85 : 1);
      return { x: 0, width: panelWidth, angle, depth, gapBefore, left: project(-panelWidth / 2), right: project(panelWidth / 2) };
    });
    if (!panels[active]) return panels;
    for (let i = active + 1; i < panels.length; i++) {
      const p = panels[i], previous = panels[i - 1];
      p.x = previous.right + p.gapBefore - p.left;
      p.left += p.x;
      p.right += p.x;
    }
    for (let i = active - 1; i >= 0; i--) {
      const p = panels[i], next = panels[i + 1];
      p.x = next.left - next.gapBefore - p.right;
      p.left += p.x;
      p.right += p.x;
    }
    return panels;
  }
  let cardWidth = maximumCard;
  if (width >= 1100 && days[active]) {
    // Preserve legibility in dense days; any remaining outer edge may peek out of the scene.
    let low = Math.min(150, maximumCard), high = maximumCard;
    const fits = (size: number) => arrange(size).every((p, index) => Math.abs(index - active) > 2 || Math.max(-p.left, p.right) <= width / 2 - 16);
    if (!fits(maximumCard)) {
      for (let step = 0; step < 16; step++) {
        const middle = (low + high) / 2;
        if (fits(middle)) low = middle;
        else high = middle;
      }
      cardWidth = low;
    }
  }
  return { cardWidth, cardGap, panels: arrange(cardWidth) };
}
