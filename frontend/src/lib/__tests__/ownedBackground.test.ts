import { describe, expect, it } from "vitest";
import { ownedBackground } from "../ownedBackground";

describe("ownedBackground", () => {
  it("returns the owned CSS variable when owned", () => {
    expect(ownedBackground(true, "var(--card)")).toBe("var(--owned-bg)");
  });
  it("returns the provided fallback when not owned", () => {
    expect(ownedBackground(false, "var(--card)")).toBe("var(--card)");
  });
  it("defaults fallback to var(--card)", () => {
    expect(ownedBackground(false)).toBe("var(--card)");
  });
});
