import { useEffect, type RefObject } from "react";
import { detectSwipe } from "./detectSwipe";

export interface UseSwipeOptions {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  threshold?: number;
  restraint?: number;
  enabled?: boolean;
}

export function useSwipe(
  ref: RefObject<HTMLElement | null>,
  options: UseSwipeOptions,
): void {
  const {
    onSwipeLeft,
    onSwipeRight,
    threshold = 50,
    restraint = 100,
    enabled = true,
  } = options;

  useEffect(() => {
    if (!enabled) return;
    const el = ref.current;
    if (!el) return;

    let startX = 0;
    let startY = 0;

    function handleStart(e: TouchEvent) {
      const t = e.changedTouches[0];
      startX = t.clientX;
      startY = t.clientY;
    }

    function handleEnd(e: TouchEvent) {
      const t = e.changedTouches[0];
      const direction = detectSwipe(
        { startX, startY, endX: t.clientX, endY: t.clientY },
        { threshold, restraint },
      );
      if (direction === "left") onSwipeLeft?.();
      else if (direction === "right") onSwipeRight?.();
    }

    el.addEventListener("touchstart", handleStart, { passive: true });
    el.addEventListener("touchend", handleEnd, { passive: true });
    return () => {
      el.removeEventListener("touchstart", handleStart);
      el.removeEventListener("touchend", handleEnd);
    };
  }, [ref, enabled, onSwipeLeft, onSwipeRight, threshold, restraint]);
}
