import { describe, expect, it } from "vitest";
import type { Work } from "../../types/work";
import type { FilterState } from "../../store/filterStore";
import { filterWorks } from "../filterWorks";

// Era / medium values are canonical name strings (matching ERAS / MEDIUMS).
const NOVEL = "Novel" as const;
const COMIC = "Comic" as const;
const REBELLION = "REBELLION" as const;            // ERAS index 5
const NEW_JEDI_ORDER = "NEW JEDI ORDER" as const;  // ERAS index 7

const w = (over: Partial<Work> & { id: string; year: number }): Work => ({
  era: REBELLION, title: "T", medium: NOVEL,
  ...over,
});

const empty: FilterState = {
  eras: [], mediums: [], decades: [], series: [], authors: [], publishers: [],
  q: "",
  releaseUndated: false,
  view: "cards", sort: "chronology", openWorkId: null,
};

describe("filterWorks", () => {
  // Catalog order matters: this is the JSON order, which the frontend treats
  // as the canonical tiebreaker via stable sorting.
  const all: Work[] = [
    w({ id: "a", title: "A New Hope", medium: NOVEL, era: REBELLION, year: 0, authors: ["Foster"] }),
    w({ id: "b", title: "Vector Prime", medium: NOVEL, era: NEW_JEDI_ORDER, year: 25, authors: ["Salvatore"] }),
    w({ id: "c", title: "Chewbacca", medium: COMIC, era: NEW_JEDI_ORDER, year: 25, authors: ["Macan"] }),
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
    const r = filterWorks(all, { ...empty, mediums: [NOVEL], eras: [NEW_JEDI_ORDER] });
    expect(r.map((x) => x.id)).toEqual(["b"]);
  });

  it("filters by decade (OR within field)", () => {
    const data: Work[] = [
      w({ id: "old",  year: 0, release_date: "1991-12-01" }),  // 1990s
      w({ id: "mid",  year: 0, release_date: "2005-03-19" }),  // 2000s
      w({ id: "new",  year: 0, release_date: "2015-09-04" }),  // 2010s
    ];
    const r = filterWorks(data, { ...empty, decades: [1990, 2010] });
    expect(r.map((x) => x.id)).toEqual(["old", "new"]);
  });

  it("decade filter excludes works without release_date", () => {
    const data: Work[] = [
      w({ id: "dated",   year: 0, release_date: "1991-12-01" }),
      w({ id: "undated", year: 0 }),
    ];
    const r = filterWorks(data, { ...empty, decades: [1990] });
    expect(r.map((x) => x.id)).toEqual(["dated"]);
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
    const data: Work[] = [
      w({ id: "later",   era: REBELLION, year: 5, title: "Later" }),
      w({ id: "earlier", era: REBELLION, year: 0, title: "Earlier" }),
    ];
    const r = filterWorks(data, empty);
    expect(r.map((x) => x.id)).toEqual(["later", "earlier"]);
  });

  it("chronology stable-sort tiebreak preserves input order across same-era works", () => {
    const data: Work[] = [
      w({ id: "z", era: REBELLION, year: 0, title: "Zeta" }),
      w({ id: "a", era: REBELLION, year: 0, title: "Alpha" }),
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

  it("releaseUndated filter keeps only works with no release_date", () => {
    const data: Work[] = [
      w({ id: "dated",   year: 0, release_date: "2000-01-01" }),
      w({ id: "undated", year: 0 }),
    ];
    const r = filterWorks(data, { ...empty, releaseUndated: true });
    expect(r.map((x) => x.id)).toEqual(["undated"]);
  });

  it("decades + releaseUndated unions: matching decade OR no release_date", () => {
    const data: Work[] = [
      w({ id: "1990s",   year: 0, release_date: "1991-01-01" }),
      w({ id: "2000s",   year: 0, release_date: "2005-01-01" }),
      w({ id: "2010s",   year: 0, release_date: "2015-01-01" }),
      w({ id: "undated", year: 0 }),
    ];
    const r = filterWorks(data, { ...empty, decades: [1990], releaseUndated: true });
    expect(r.map((x) => x.id).sort()).toEqual(["1990s", "undated"]);
  });

  it("search bypasses releaseUndated filter — searching returns dated matches too", () => {
    const data: Work[] = [
      w({ id: "dated",   title: "Dark Empire", year: 0, release_date: "1991-12-01" }),
      w({ id: "undated", title: "Dark Sketches", year: 0 }),
    ];
    const withoutSearch = filterWorks(data, { ...empty, releaseUndated: true });
    expect(withoutSearch.map((x) => x.id)).toEqual(["undated"]);
    const withSearch = filterWorks(data, { ...empty, releaseUndated: true, q: "dark" });
    expect(withSearch.map((x) => x.id)).toEqual(["dated", "undated"]);
  });

  it("search bypasses era filter — searching returns matches from all eras", () => {
    const data: Work[] = [
      w({ id: "era5", title: "Shadow of the Empire", era: REBELLION, year: 0 }),
      w({ id: "era7", title: "Shadow of Doubt",      era: NEW_JEDI_ORDER, year: 1 }),
    ];
    const withoutSearch = filterWorks(data, { ...empty, eras: [REBELLION] });
    expect(withoutSearch.map((x) => x.id)).toEqual(["era5"]);
    const withSearch = filterWorks(data, { ...empty, eras: [REBELLION], q: "shadow" });
    expect(withSearch.map((x) => x.id)).toEqual(["era5", "era7"]);
  });

  it("search bypasses decade filter — searching returns matches across decades", () => {
    const data: Work[] = [
      w({ id: "inside",  title: "Dark Empire", year: 0, release_date: "1991-12-01" }),
      w({ id: "outside", title: "Dark Force Rising", year: 1, release_date: "2015-09-04" }),
    ];
    const withoutSearch = filterWorks(data, { ...empty, decades: [1990] });
    expect(withoutSearch.map((x) => x.id)).toEqual(["inside"]);
    const withSearch = filterWorks(data, { ...empty, decades: [1990], q: "dark" });
    expect(withSearch.map((x) => x.id)).toEqual(["inside", "outside"]);
  });
});
