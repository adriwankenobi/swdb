import { describe, expect, it } from "vitest";
import type { Work, DerivedCollection } from "../../types/work";
import type { FilterState } from "../../store/filterStore";
import { filterWorks, filterAndSortItems } from "../filterWorks";

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
  collections: [],
  q: "",
  releaseUndated: false,
  view: "cards", sort: "chronology", items: "issues",
  openWorkId: null, openCollectionId: null,
  ownership: "all",
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

  it("authors filter with Uncredited sentinel matches works without authors", async () => {
    const { UNCREDITED_AUTHOR_VALUE } = await import("../../store/catalogStore");
    const data: Work[] = [
      w({ id: "with",     year: 0, authors: ["Foster"] }),
      w({ id: "without",  year: 0 }),
    ];
    const r = filterWorks(data, { ...empty, authors: [UNCREDITED_AUTHOR_VALUE] });
    expect(r.map((x) => x.id)).toEqual(["without"]);
  });

  it("authors filter with Uncredited + real name unions both", async () => {
    const { UNCREDITED_AUTHOR_VALUE } = await import("../../store/catalogStore");
    const data: Work[] = [
      w({ id: "foster",  year: 0, authors: ["Foster"] }),
      w({ id: "macan",   year: 0, authors: ["Macan"] }),
      w({ id: "without", year: 0 }),
    ];
    const r = filterWorks(data, {
      ...empty,
      authors: [UNCREDITED_AUTHOR_VALUE, "Foster"],
    });
    expect(r.map((x) => x.id).sort()).toEqual(["foster", "without"]);
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

const baseState: FilterState = {
  eras: [], mediums: [], decades: [], series: [], authors: [],
  publishers: [], collections: [], q: "", releaseUndated: false,
  view: "cards", sort: "chronology", items: "collections",
  openWorkId: null, openCollectionId: null,
  ownership: "all",
};

const work = (id: string, extra: Partial<Work> = {}): Work => ({
  id, era: "REBELLION", title: id, medium: "Comic", year: 0, ...extra,
});

describe("filterAndSortItems — collections view aggregation", () => {
  it("includes a collection when an era matches via any member", () => {
    const works: Work[] = [
      work("a", { era: "REBELLION" }),
      work("b", { era: "NEW REPUBLIC" }),
    ];
    const c: DerivedCollection = {
      id: "c1", title: "C", eras: ["REBELLION", "NEW REPUBLIC"],
      mediums: ["Comic"], series: [], authors: [], publishers: [], year: 0, anchor_era: "REBELLION",
      member_ids: ["a", "b"],
    };
    const items = filterAndSortItems(
      works, [c],
      { ...baseState, eras: ["NEW REPUBLIC"] },
      { worksById: new Map(works.map((w) => [w.id, w])) },
    );
    expect(items.map((i) => (i.kind === "collection" ? i.collection.id : i.work.id)))
      .toEqual(["c1"]);
  });

  it("chronology: collection sorts at the Excel position of its earliest issue, interleaved with loose works", () => {
    // Excel (works.json) order: loose1, m1, loose2, m2.
    const works: Work[] = [
      work("loose1"),
      work("m1"),
      work("loose2"),
      work("m2"),
    ];
    const c: DerivedCollection = {
      id: "c1", title: "C", eras: ["REBELLION"], mediums: ["Comic"], series: [], authors: [], publishers: [],
      year: 0, anchor_era: "REBELLION",
      member_ids: ["m1", "m2"],
    };
    const items = filterAndSortItems(
      works, [c],
      { ...baseState },
      {
        worksById: new Map(works.map((w) => [w.id, w])),
        // Loose works only show in collections mode when owned.
        ownedIds: new Set(["loose1", "loose2"]),
      },
    );
    // c borrows m1's position (index 1), landing between loose1 (0) and loose2 (2).
    expect(items.map((i) => (i.kind === "collection" ? i.collection.id : i.work.id)))
      .toEqual(["loose1", "c1", "loose2"]);
  });

  it("excludes a collection when no member matches the series filter", () => {
    const works: Work[] = [
      work("a", { series: ["Alpha"] }),
      work("b", { series: ["Alpha"] }),
    ];
    const c: DerivedCollection = {
      id: "c1", title: "C", eras: ["REBELLION"], mediums: ["Comic"], series: [], authors: [], publishers: [],
      year: 0, anchor_era: "REBELLION",
      member_ids: ["a", "b"],
    };
    const items = filterAndSortItems(
      works, [c],
      { ...baseState, series: ["Beta"] },
      { worksById: new Map(works.map((w) => [w.id, w])) },
    );
    expect(items).toEqual([]);
  });

  it("issues mode: selecting a collection shows its member works (via derived membership)", () => {
    const works: Work[] = [work("a"), work("b"), work("c")];
    const c: DerivedCollection = {
      id: "c1", title: "C", eras: ["REBELLION"], mediums: ["Comic"], series: [], authors: [], publishers: [],
      year: 0, anchor_era: "REBELLION",
      member_ids: ["a", "b"],
    };
    const items = filterAndSortItems(
      works, [c],
      { ...baseState, items: "issues", collections: ["c1"] },
      { worksById: new Map(works.map((w) => [w.id, w])) },
    );
    expect(items.map((i) => (i.kind === "work" ? i.work.id : i.collection.id)).sort())
      .toEqual(["a", "b"]);
  });
});

describe("filterAndSortItems — collections mode owned-only loose works", () => {
  it("collections mode shows owned loose works + collections, hides unowned loose works", () => {
    // m1 is a collection member, o1 is an owned loose work, u1 is an unowned loose work.
    const works: Work[] = [
      work("m1"),
      work("o1"),
      work("u1"),
    ];
    const c: DerivedCollection = {
      id: "c1", title: "C", eras: ["REBELLION"], mediums: ["Comic"], series: [], authors: [], publishers: [],
      year: 0, anchor_era: "REBELLION",
      member_ids: ["m1"],
    };
    const ownedIds = new Set(["m1", "o1"]);
    const ctx = { worksById: new Map(works.map((w) => [w.id, w])), ownedIds };
    const items = filterAndSortItems(
      works, [c],
      { ...baseState, items: "collections" },
      ctx,
    );
    const ids = items.map((i) => (i.kind === "collection" ? i.collection.id : i.work.id));
    // Collection appears; o1 (owned loose) appears; u1 (unowned loose) and m1 (folded) are absent.
    expect(ids).toContain("c1");
    expect(ids).toContain("o1");
    expect(ids).not.toContain("u1");
    expect(ids).not.toContain("m1");
  });
});

describe("filterAndSortItems — ownership", () => {
  const works = [
    { id: "w1", era: "REBELLION", title: "Owned One", medium: "Novel", year: 0 },
    { id: "w2", era: "REBELLION", title: "Unowned Two", medium: "Novel", year: 1 },
  ] as never[];
  const ctx = { worksById: new Map((works as any[]).map((w: any) => [w.id, w])), ownedIds: new Set(["w1"]) };
  const base: FilterState = { ...baseState, items: "issues" };

  it("ownership=all shows both", () => {
    const out = filterAndSortItems(works, [], { ...base, ownership: "all" }, ctx);
    expect(out.length).toBe(2);
  });
  it("ownership=owned shows only owned", () => {
    const out = filterAndSortItems(works, [], { ...base, ownership: "owned" }, ctx);
    expect(out.map((i: any) => i.work.id)).toEqual(["w1"]);
  });
  it("ownership=unowned shows only unowned", () => {
    const out = filterAndSortItems(works, [], { ...base, ownership: "unowned" }, ctx);
    expect(out.map((i: any) => i.work.id)).toEqual(["w2"]);
  });
  it("ignores ownership when signed out (no ownedIds in ctx)", () => {
    // ownership=owned but ctx has NO ownedIds → must not empty the catalog
    const out = filterAndSortItems(
      works, [], { ...base, items: "issues", ownership: "owned" },
      { worksById: ctx.worksById }, // no ownedIds
    );
    expect(out.length).toBe(2);
  });
});
