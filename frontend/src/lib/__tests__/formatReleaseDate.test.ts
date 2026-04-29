import { describe, expect, it } from "vitest";
import { formatReleaseDate, formatReleaseDateCompact } from "../formatReleaseDate";

describe("formatReleaseDate", () => {
  it("formats day precision as long English", () => {
    expect(formatReleaseDate("1976-11-12", "day")).toBe("November 12, 1976");
  });

  it("formats month precision without day", () => {
    expect(formatReleaseDate("1996-11-01", "month")).toBe("November 1996");
  });

  it("formats year precision as bare year", () => {
    expect(formatReleaseDate("1989-01-01", "year")).toBe("1989");
  });

  it("defaults to day precision when omitted", () => {
    expect(formatReleaseDate("1976-11-12")).toBe("November 12, 1976");
  });
});

describe("formatReleaseDateCompact", () => {
  it("returns truncated ISO per precision", () => {
    expect(formatReleaseDateCompact("1976-11-12", "day")).toBe("1976-11-12");
    expect(formatReleaseDateCompact("1996-11-01", "month")).toBe("1996-11");
    expect(formatReleaseDateCompact("1989-01-01", "year")).toBe("1989");
  });
});
