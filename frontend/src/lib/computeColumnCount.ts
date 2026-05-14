export const MIN_CARD_WIDTH = 180;
export const COL_GAP = 16;
export const NARROW_VIEWPORT_MAX = 640;
export const NARROW_MIN_COLS = 3;

export function computeColumnCount(containerWidth: number, viewportWidth: number): number {
  const calculated = Math.floor((containerWidth + COL_GAP) / (MIN_CARD_WIDTH + COL_GAP));
  const minCols = viewportWidth < NARROW_VIEWPORT_MAX ? NARROW_MIN_COLS : 1;
  return Math.max(minCols, calculated);
}
