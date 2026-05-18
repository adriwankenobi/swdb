import { describe, it, expect } from "vitest";
import { computeNeighbors } from "../computeNeighbors";
import type { Item } from "../buildItemsList";
import type { Work, Collection } from "@/types/work";

function w(id: string): Work {
  return { id, era: "REBELLION", title: id, medium: "Comic", year: 0 };
}

function c(id: string): Collection {
  return {
    id,
    title: id,
    eras: ["REBELLION"],
    mediums: ["Comic"],
    year: 0,
    anchor_year: 0,
    anchor_era: "REBELLION",
    anchor_member_id: "x",
    member_ids: ["x"],
  };
}

const itemW = (id: string): Item => ({ kind: "work", work: w(id) });
const itemC = (id: string): Item => ({ kind: "collection", collection: c(id) });

describe("computeNeighbors", () => {
  it("returns prev and next for a middle work item", () => {
    const items: Item[] = [itemW("a"), itemW("b"), itemW("c")];
    expect(computeNeighbors(items, "b", null)).toEqual({
      prevItem: items[0],
      nextItem: items[2],
      isOrphan: false,
    });
  });

  it("returns null prev at first index", () => {
    const items: Item[] = [itemW("a"), itemW("b")];
    expect(computeNeighbors(items, "a", null)).toEqual({
      prevItem: null,
      nextItem: items[1],
      isOrphan: false,
    });
  });

  it("returns null next at last index", () => {
    const items: Item[] = [itemW("a"), itemW("b")];
    expect(computeNeighbors(items, "b", null)).toEqual({
      prevItem: items[0],
      nextItem: null,
      isOrphan: false,
    });
  });

  it("returns isOrphan=true when the open work id is not in the list", () => {
    const items: Item[] = [itemW("a"), itemW("b")];
    expect(computeNeighbors(items, "z", null)).toEqual({
      prevItem: null,
      nextItem: null,
      isOrphan: true,
    });
  });

  it("returns isOrphan=true when the open collection id is not in the list", () => {
    const items: Item[] = [itemC("c1"), itemC("c2")];
    expect(computeNeighbors(items, null, "missing")).toEqual({
      prevItem: null,
      nextItem: null,
      isOrphan: true,
    });
  });

  it("returns all-nulls and isOrphan=false when no id is open", () => {
    const items: Item[] = [itemW("a")];
    expect(computeNeighbors(items, null, null)).toEqual({
      prevItem: null,
      nextItem: null,
      isOrphan: false,
    });
  });

  it("returns both nulls when the list has only the open item", () => {
    const items: Item[] = [itemW("a")];
    expect(computeNeighbors(items, "a", null)).toEqual({
      prevItem: null,
      nextItem: null,
      isOrphan: false,
    });
  });

  it("matches the open id by kind: a work id ignores a same-string collection id", () => {
    // Defensive: works and collections live in disjoint id spaces, but the
    // matcher must still key off `kind` not just id.
    const items: Item[] = [itemC("shared"), itemW("shared")];
    // Open as a work → find the work item (index 1), prev is the collection.
    expect(computeNeighbors(items, "shared", null)).toEqual({
      prevItem: items[0],
      nextItem: null,
      isOrphan: false,
    });
  });

  it("crosses types: prev/next can be of the other kind", () => {
    const items: Item[] = [itemW("a"), itemC("c1"), itemW("b")];
    expect(computeNeighbors(items, null, "c1")).toEqual({
      prevItem: items[0],
      nextItem: items[2],
      isOrphan: false,
    });
  });
});
