// Placement for the interactive plate. A collapsed or zero-size pane returns
// null. Callers must leave the previous scale alone in that case. Clamping a
// bad measurement up to the 5% pinch floor is what drew the thumbnail.

export const MIN_SCALE = 0.05;
export const MAX_SCALE = 4;
export const FIT_PAD = 24;
export const READABLE_WIDTH = 600;

export function fitPlacement(viewWidth, viewHeight, contentWidth, contentHeight) {
  if (!(viewWidth >= 64) || !(viewHeight >= 64)) return null;
  if (!(contentWidth >= 1) || !(contentHeight >= 1)) return null;
  const availW = viewWidth - FIT_PAD;
  const availH = viewHeight - FIT_PAD;
  if (availW < 1 || availH < 1) return null;
  const contain = Math.min(availW / contentWidth, availH / contentHeight);
  const widthFit = availW / contentWidth;
  let scale = contain;
  // The plate is taller than a laptop window. Containing it entirely would
  // draw it under 600px wide. Fill the width instead and let the reader pan
  // down. A phone is narrower than 600px, so the whole plate stays in view.
  if (availW >= READABLE_WIDTH && contentWidth * contain < READABLE_WIDTH) {
    scale = widthFit;
  }
  if (!Number.isFinite(scale) || scale < MIN_SCALE) return null;
  if (scale > MAX_SCALE) scale = MAX_SCALE;
  const drawnW = contentWidth * scale;
  const drawnH = contentHeight * scale;
  return {
    scale,
    x: (viewWidth - drawnW) / 2,
    y: drawnH + FIT_PAD <= viewHeight ? (viewHeight - drawnH) / 2 : FIT_PAD / 2,
  };
}
