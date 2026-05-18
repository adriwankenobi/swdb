import { describe, it, expect } from "vitest";
import { detectSwipe } from "../detectSwipe";

const opts = { threshold: 50, restraint: 100 };

describe("detectSwipe", () => {
  it("returns 'right' when horizontal delta is positive and beyond threshold", () => {
    expect(detectSwipe({ startX: 100, startY: 200, endX: 200, endY: 210 }, opts))
      .toBe("right");
  });

  it("returns 'left' when horizontal delta is negative and beyond threshold", () => {
    expect(detectSwipe({ startX: 200, startY: 200, endX: 50, endY: 210 }, opts))
      .toBe("left");
  });

  it("returns null when horizontal delta is below threshold", () => {
    expect(detectSwipe({ startX: 100, startY: 200, endX: 130, endY: 200 }, opts))
      .toBeNull();
  });

  it("returns null when vertical delta exceeds restraint (vertical scroll)", () => {
    expect(detectSwipe({ startX: 100, startY: 100, endX: 200, endY: 400 }, opts))
      .toBeNull();
  });

  it("returns null when start equals end", () => {
    expect(detectSwipe({ startX: 100, startY: 100, endX: 100, endY: 100 }, opts))
      .toBeNull();
  });

  it("treats threshold as inclusive — exactly threshold counts as a swipe", () => {
    expect(detectSwipe({ startX: 0, startY: 0, endX: 50, endY: 0 }, opts))
      .toBe("right");
  });

  it("treats restraint as inclusive — exactly restraint still counts", () => {
    expect(detectSwipe({ startX: 0, startY: 0, endX: 60, endY: 100 }, opts))
      .toBe("right");
  });
});
