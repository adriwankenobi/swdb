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
});
