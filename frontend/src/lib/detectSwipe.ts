export interface SwipePoints {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}

export interface SwipeOptions {
  threshold: number;
  restraint: number;
}

export type SwipeDirection = "left" | "right";

export function detectSwipe(
  points: SwipePoints,
  options: SwipeOptions,
): SwipeDirection | null {
  const dx = points.endX - points.startX;
  const dy = points.endY - points.startY;
  if (Math.abs(dy) > options.restraint) return null;
  if (Math.abs(dx) < options.threshold) return null;
  return dx >= 0 ? "right" : "left";
}
