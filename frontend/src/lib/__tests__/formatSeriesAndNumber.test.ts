import { describe, expect, it } from "vitest";
import { formatSeriesAndNumber, formatWorkTitle } from "@/lib/formatSeriesAndNumber";
import type { Work } from "@/types/work";

const base: Work = {
  id: "1", era: "THE CLONE WARS", title: "The Battle of Jabiim",
  medium: "Comic", year: -22,
};

describe("formatSeriesAndNumber", () => {
  it("renders series with series_number as 'Series #N'", () => {
    const w = { ...base, series: ["Republic"], series_number: ["56"] };
    expect(formatSeriesAndNumber(w)).toBe("Republic #56");
  });

  it("uses a space (no #) for TV shows", () => {
    const w: Work = { ...base, medium: "TV Show", series: ["The Clone Wars"], series_number: ["1"] };
    expect(formatSeriesAndNumber(w)).toBe("The Clone Wars 1");
  });

  it("joins multiple series", () => {
    const w = { ...base, series: ["X-Wing", "Rebel"], series_number: ["5", "12"] };
    expect(formatSeriesAndNumber(w)).toBe("X-Wing #5, Rebel #12");
  });

  it("falls back to #N when there is no series", () => {
    const w = { ...base, series_number: ["3"] };
    expect(formatSeriesAndNumber(w)).toBe("#3");
  });
});

describe("formatWorkTitle", () => {
  it("appends the per-work number as #N (same format as the series)", () => {
    expect(
      formatWorkTitle({ title: "The Battle of Jabiim", number: "2", medium: "Comic" }),
    ).toBe("The Battle of Jabiim #2");
  });

  it("uses a plain space (no #) for TV shows", () => {
    expect(
      formatWorkTitle({ title: "The Clone Wars", number: "1", medium: "TV Show" }),
    ).toBe("The Clone Wars 1");
  });

  it("returns the bare title when there is no number", () => {
    expect(formatWorkTitle({ title: "A New Hope", medium: "Novel" })).toBe("A New Hope");
  });
});
