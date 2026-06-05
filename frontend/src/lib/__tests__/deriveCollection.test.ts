import { expect, it } from "vitest";
import { deriveCollection } from "../deriveCollection";
import type { UserCollection, Work } from "../../types/work";

const works: Work[] = [
  { id: "a", era: "REBELLION", title: "A", medium: "Novel", year: 0, release_date: "1977-01-01", release_precision: "day", series: ["Saga"], authors: ["Foster"], publisher: "Del Rey" } as Work,
  { id: "b", era: "PRE-REPUBLIC", title: "B", medium: "Comic", year: -25000, release_date: "1975-01-01", release_precision: "day", series: ["Dawn", "Saga"], authors: ["Foster", "Ostrander"], publisher: "Dark Horse" } as Work,
];
const byId = new Map(works.map((w) => [w.id, w]));

it("derives unions, min year, earliest-year anchor era, and min release date", () => {
  const raw: UserCollection = { id: "c1", title: "Mine", number: 7, member_ids: ["a", "b"] };
  const d = deriveCollection(raw, byId);
  expect(d.number).toBe(7); // passed through from the raw collection
  expect(d.eras.sort()).toEqual(["PRE-REPUBLIC", "REBELLION"]);
  expect(d.mediums.sort()).toEqual(["Comic", "Novel"]);
  expect(d.year).toBe(-25000);
  expect(d.anchor_era).toBe("PRE-REPUBLIC");
  expect(d.release_date).toBe("1977-01-01"); // LATEST member release
  expect(d.series.sort()).toEqual(["Dawn", "Saga"]); // union, deduped
  expect(d.authors.sort()).toEqual(["Foster", "Ostrander"]); // union, deduped
  expect(d.publishers.sort()).toEqual(["Dark Horse", "Del Rey"]); // union, deduped
  expect(d.member_ids).toEqual(["a", "b"]);
});

it("computes year_end from the max member end year and omits it when single-year", () => {
  const spanWorks: Work[] = [
    { id: "x", era: "REBELLION", title: "X", medium: "TV Show", year: 0, year_end: 3 } as Work,
    { id: "y", era: "REBELLION", title: "Y", medium: "Novel", year: 1 } as Work,
  ];
  const spanById = new Map(spanWorks.map((w) => [w.id, w]));
  const spanned = deriveCollection({ id: "c2", title: "Span", member_ids: ["x", "y"] }, spanById);
  expect(spanned.year).toBe(0);
  expect(spanned.year_end).toBe(3); // max of (year_end 3, year 1)

  const single = deriveCollection({ id: "c3", title: "Single", member_ids: ["y"] }, spanById);
  expect(single.year).toBe(1);
  expect(single.year_end).toBeUndefined(); // suppressed when equal to year
});

it("skips unknown member ids (orphans) without crashing", () => {
  const raw: UserCollection = { id: "c1", title: "Mine", member_ids: ["a", "ghost"] };
  const d = deriveCollection(raw, byId);
  expect(d.eras).toEqual(["REBELLION"]);
  expect(d.year).toBe(0);
});

it("falls back gracefully when a collection has no known members", () => {
  const raw: UserCollection = { id: "c1", title: "Empty", member_ids: ["ghost"] };
  const d = deriveCollection(raw, byId);
  expect(d.eras).toEqual([]);
  expect(d.mediums).toEqual([]);
  expect(d.year).toBe(0);
  expect(d.anchor_era).toBe("");
});
