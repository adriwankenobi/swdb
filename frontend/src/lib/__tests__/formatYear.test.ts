import { describe, expect, it } from "vitest";
import { formatYear } from "../formatYear";

describe("formatYear", () => {
  it("formats positive years as ABY", () => {
    expect(formatYear(0)).toBe("0 ABY");
    expect(formatYear(4)).toBe("4 ABY");
  });

  it("formats negative years as BBY", () => {
    expect(formatYear(-19)).toBe("19 BBY");
    expect(formatYear(-25793)).toBe("25,793 BBY");
  });

  it("formats large positive years with thousands separators", () => {
    expect(formatYear(140)).toBe("140 ABY");
    expect(formatYear(25793)).toBe("25,793 ABY");
  });

  it("collapses a degenerate range (start == end) to a single year", () => {
    expect(formatYear(-5000, -5000)).toBe("5,000 BBY");
  });

  it("formats same-era ranges with both endpoints labeled", () => {
    expect(formatYear(-5000, -3000)).toBe("5,000 BBY - 3,000 BBY");
    expect(formatYear(-3, 0)).toBe("3 BBY - 0 ABY");
  });

  it("formats cross-era ranges", () => {
    expect(formatYear(-5000, 4)).toBe("5,000 BBY - 4 ABY");
  });

  it("preserves thousands separators on each endpoint", () => {
    expect(formatYear(-25200, -671)).toBe("25,200 BBY - 671 BBY");
  });
});
