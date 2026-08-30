// Single source of truth for the "UE" mark: a U built from a left stem, a
// bottom bridge, and a shared right stem — and an E whose three horizontal
// arms extend directly out of that same shared stem, so the two letters
// are literally connected rather than just placed side by side.
//
// Returns a list of rectangles { x, y, w, h, rx } in a 0..100 (w) x 0..100 (h)
// box, so callers can scale to whatever unit system they need (pt for
// jsPDF, px/viewBox for SVG).
export function ueMarkRects() {
  const stem = 20; // stroke thickness
  const gap = stem * 1.5; // distance from left stem to shared stem
  const uHeight = 74; // U is slightly shorter than the full mark height
  const fullHeight = 100;
  const armWidth = 58;
  const r = 4; // corner radius

  const leftStemX = 0;
  const sharedStemX = gap;

  return [
    // U — left stem
    { x: leftStemX, y: fullHeight - uHeight, w: stem, h: uHeight, rx: r },
    // U — bottom bridge (also touches the shared stem)
    { x: leftStemX, y: fullHeight - stem, w: sharedStemX + stem, h: stem, rx: r },
    // Shared stem — right side of U AND spine of E, full height
    { x: sharedStemX, y: 0, w: stem, h: fullHeight, rx: r },
    // E — top arm
    { x: sharedStemX + stem, y: 0, w: armWidth, h: stem, rx: r },
    // E — middle arm
    { x: sharedStemX + stem, y: fullHeight / 2 - stem / 2, w: armWidth * 0.8, h: stem, rx: r },
    // E — bottom arm
    { x: sharedStemX + stem, y: fullHeight - stem, w: armWidth, h: stem, rx: r },
  ];
}

export const UE_BLUE = '#2563EB';
export const UE_BLUE_RGB = [37, 99, 235];
