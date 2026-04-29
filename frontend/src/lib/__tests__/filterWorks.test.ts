import { describe, expect, it } from "vitest";
import type { Work } from "../../types/work";
import type { FilterState } from "../../store/filterStore";
import { filterWorks } from "../filterWorks";

// Medium indices (alphabetical canonical order):
// 0 Comic, 1 Junior Novel, 2 Movie, 3 Novel, 4 Short Story, 5 TV Show, 6 Videogame
const NOVEL = 3;
const COMIC = 0;

const w = (over: Partial<Work> & { id: string; year: number }): Work => ({
  era: 5, title: "T", medium: NOVEL,
  ...over,
});

const empty: FilterState = {
  eras: [], mediums: [], series: [], authors: [], publishers: [],
  q: "", yearMin: null, yearMax: null, releaseMin: null, releaseMax: null,
  view: "cards", sort: "chronology", openWorkId: null,
};

describe("filterWorks", () => {
  // Catalog order matters: this is the JSON order, which the frontend treats
  // as the canonical tiebreaker via stable sorting.
  const all: Work[] = [
    w({ id: "a", title: "A New Hope", medium: NOVEL, era: 5, year: 0, authors: ["Foster"] }),
    w({ id: "b", title: "Vector Prime", medium: NOVEL, era: 7, year: 25, authors: ["Salvatore"] }),
    w({ id: "c", title: "Chewbacca", medium: COMIC, era: 7, year: 25, authors: ["Macan"] }),
  ];

  it("returns all when no filters", () => {
    expect(filterWorks(all, empty)).toHaveLength(3);
  });

  it("filters by medium (OR within field)", () => {
    const r = filterWorks(all, { ...empty, mediums: [NOVEL, COMIC] });
    expect(r).toHaveLength(3);
    const r2 = filterWorks(all, { ...empty, mediums: [NOVEL] });
    expect(r2.map((x) => x.id)).toEqual(["a", "b"]);
  });

  it("filters by era and medium (AND between fields)", () => {
    const r = filterWorks(all, { ...empty, mediums: [NOVEL], eras: [7] });
    expect(r.map((x) => x.id)).toEqual(["b"]);
  });

  it("filters by year range inclusive", () => {
    const r = filterWorks(all, { ...empty, yearMin: 0, yearMax: 10 });
    expect(r.map((x) => x.id)).toEqual(["a"]);
  });

  it("year filter matches a range work when the window overlaps its span", () => {
    // Work spans -5000 to -3000 BBY.
    const data: Work[] = [w({ id: "span", year: -5000, year_end: -3000 })];
    // Window contained within span.
    expect(filterWorks(data, { ...empty, yearMin: -4000, yearMax: -3500 }).map((x) => x.id)).toEqual(["span"]);
    // Window touches start.
    expect(filterWorks(data, { ...empty, yearMin: -6000, yearMax: -5000 }).map((x) => x.id)).toEqual(["span"]);
    // Window touches end.
    expect(filterWorks(data, { ...empty, yearMin: -3000, yearMax: -2000 }).map((x) => x.id)).toEqual(["span"]);
    // Window fully before the span.
    expect(filterWorks(data, { ...empty, yearMin: -10000, yearMax: -6000 })).toHaveLength(0);
    // Window fully after the span.
    expect(filterWorks(data, { ...empty, yearMin: -2000, yearMax: 0 })).toHaveLength(0);
  });

  it("free-text search matches title", () => {
    const r = filterWorks(all, { ...empty, q: "hope" });
    expect(r.map((x) => x.id)).toEqual(["a"]);
  });

  it("free-text search matches author", () => {
    const r = filterWorks(all, { ...empty, q: "macan" });
    expect(r.map((x) => x.id)).toEqual(["c"]);
  });

  it("chronology sort: era then Excel order (stable; year is not a tiebreaker)", () => {
    const r = filterWorks(all, empty);
    expect(r.map((x) => x.id)).toEqual(["a", "b", "c"]);
  });

  it("chronology sort uses Excel order within an era, not year", () => {
    // Within era 5, the 'later' work appears in the input BEFORE 'earlier' but
    // has a higher in-universe year. Output keeps input order — proving the
    // sort relies on Excel position, not the year column.
    const data: Work[] = [
      w({ id: "later",   era: 5, year: 5, title: "Later" }),
      w({ id: "earlier", era: 5, year: 0, title: "Earlier" }),
    ];
    const r = filterWorks(data, empty);
    expect(r.map((x) => x.id)).toEqual(["later", "earlier"]);
  });

  it("chronology stable-sort tiebreak preserves input order across same-era works", () => {
    // 'z' precedes 'a' in the input; both have era=5; output keeps that.
    const data: Work[] = [
      w({ id: "z", era: 5, year: 0, title: "Zeta" }),
      w({ id: "a", era: 5, year: 0, title: "Alpha" }),
    ];
    const r = filterWorks(data, empty);
    expect(r.map((x) => x.id)).toEqual(["z", "a"]);
  });

  it("release sort: release_date asc, missing dates last, ties keep input order", () => {
    const data: Work[] = [
      w({ id: "x", year: 0, release_date: "2010-01-01" }),
      w({ id: "y", year: 0, release_date: "1999-01-01" }),
      w({ id: "z", year: 0 }),
    ];
    const r = filterWorks(data, { ...empty, sort: "release" });
    expect(r.map((x) => x.id)).toEqual(["y", "x", "z"]);
  });

  it("release sort: equal-date works keep input order", () => {
    const data: Work[] = [
      w({ id: "first", year: 0, release_date: "2010-01-01" }),
      w({ id: "second", year: 0, release_date: "2010-01-01" }),
    ];
    const r = filterWorks(data, { ...empty, sort: "release" });
    expect(r.map((x) => x.id)).toEqual(["first", "second"]);
  });

  it("filters by release date range inclusive", () => {
    const data: Work[] = [
      w({ id: "early", year: 0, release_date: "1976-11-12" }),
      w({ id: "mid",   year: 0, release_date: "1999-04-01" }),
      w({ id: "late",  year: 0, release_date: "2015-09-04" }),
    ];
    const r = filterWorks(data, { ...empty, releaseMin: "1990-01-01", releaseMax: "2010-01-01" });
    expect(r.map((x) => x.id)).toEqual(["mid"]);
  });

  it("release date filter excludes works without release_date", () => {
    const data: Work[] = [
      w({ id: "dated",   year: 0, release_date: "2000-01-01" }),
      w({ id: "undated", year: 0 }),
    ];
    const r = filterWorks(data, { ...empty, releaseMin: "1990-01-01", releaseMax: "2010-01-01" });
    expect(r.map((x) => x.id)).toEqual(["dated"]);
  });

  it("release date filter inactive shows all (including undated)", () => {
    const data: Work[] = [
      w({ id: "dated",   year: 0, release_date: "2000-01-01" }),
      w({ id: "undated", year: 0 }),
    ];
    const r = filterWorks(data, { ...empty, releaseMin: null, releaseMax: null });
    expect(r).toHaveLength(2);
  });

  it("search bypasses era filter — searching returns matches from all eras", () => {
    const data: Work[] = [
      w({ id: "era5", title: "Shadow of the Empire", era: 5, year: 0 }),
      w({ id: "era7", title: "Shadow of Doubt",      era: 7, year: 1 }),
    ];
    // Without search: era filter restricts to era 5 only
    const withoutSearch = filterWorks(data, { ...empty, eras: [5] });
    expect(withoutSearch.map((x) => x.id)).toEqual(["era5"]);
    // With search active: era filter is bypassed, both works match "shadow"
    const withSearch = filterWorks(data, { ...empty, eras: [5], q: "shadow" });
    expect(withSearch.map((x) => x.id)).toEqual(["era5", "era7"]);
  });

  it("search bypasses release filter — searching returns matches across release dates", () => {
    const data: Work[] = [
      w({ id: "inside",  title: "Dark Empire", year: 0, release_date: "1991-12-01" }),
      w({ id: "outside", title: "Dark Force Rising", year: 1, release_date: "1992-06-01" }),
    ];
    // Without search: range excludes "outside"
    const withoutSearch = filterWorks(data, {
      ...empty, releaseMin: "1990-01-01", releaseMax: "1992-01-01",
    });
    expect(withoutSearch.map((x) => x.id)).toEqual(["inside"]);
    // With search active: release filter is bypassed, both works match "dark"
    const withSearch = filterWorks(data, {
      ...empty, releaseMin: "1990-01-01", releaseMax: "1992-01-01", q: "dark",
    });
    expect(withSearch.map((x) => x.id)).toEqual(["inside", "outside"]);
  });
});
