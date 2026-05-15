import { describe, expect, it } from "vitest";
import { computeColumnCount } from "../computeColumnCount";

describe("computeColumnCount", () => {
  describe("narrow viewport (< 640px)", () => {
    it("returns 3 even when calculation would give 1", () => {
      // 375px viewport, container = 343 (viewport - p-4)
      expect(computeColumnCount(343, 375)).toBe(3);
    });

    it("returns 3 even when calculation would give 2", () => {
      // 500px viewport, container = 468
      expect(computeColumnCount(468, 500)).toBe(3);
    });

    it("returns calculated value when it exceeds the floor (hypothetical wide container)", () => {
      // unusual but well-defined: container wider than viewport — formula still applies
      expect(computeColumnCount(1000, 600)).toBe(5);
    });
  });

  describe("non-narrow viewport (>= 640px)", () => {
    it("returns 3 at 640 viewport with full-width container", () => {
      expect(computeColumnCount(608, 640)).toBe(3);
    });

    it("returns 2 at 768 viewport when sidebar shrinks container to 448", () => {
      // existing pre-redesign behavior: sidebar appears at md, container drops
      expect(computeColumnCount(448, 768)).toBe(2);
    });

    it("returns 4 at 1280 viewport with sidebar (container ~960)", () => {
      expect(computeColumnCount(960, 1280)).toBe(4);
    });

    it("returns at least 1 at extremely narrow non-narrow-viewport", () => {
      // pathological: tall narrow window at 700 viewport with sidebar
      expect(computeColumnCount(100, 700)).toBe(1);
    });
  });
});
