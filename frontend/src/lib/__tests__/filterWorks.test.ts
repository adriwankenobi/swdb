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
  q: "", yearMin: null, yearMax: null,
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

  it("free-text search matches title", () => {
    const r = filterWorks(all, { ...empty, q: "hope" });
    expect(r.map((x) => x.id)).toEqual(["a"]);
  });

  it("free-text search matches author", () => {
    const r = filterWorks(all, { ...empty, q: "macan" });
    expect(r.map((x) => x.id)).toEqual(["c"]);
  });

  it("chronology sort: era, then year, then JSON order (stable)", () => {
    const r = filterWorks(all, empty);
    expect(r.map((x) => x.id)).toEqual(["a", "b", "c"]);
  });

  it("chronology stable-sort tiebreak preserves input order", () => {
    // 'z' precedes 'a' in the input; both have era=5 and year=0; output keeps that.
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
});
