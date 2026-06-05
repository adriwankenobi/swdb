import { describe, it, expect } from "vitest";
import { buildItemsList } from "../buildItemsList";
import type { Work, DerivedCollection } from "../../types/work";

const w = (id: string, era: Work["era"], extra: Partial<Work> = {}): Work => ({
  id, era, title: id, medium: "Comic", year: 0, ...extra,
});

const dc = (id: string, memberIds: string[], extra: Partial<DerivedCollection> = {}): DerivedCollection => ({
  id, title: id, member_ids: memberIds,
  eras: ["REBELLION"], mediums: ["Comic"], series: [], authors: [], publishers: [],
  year: 0, anchor_era: "REBELLION",
  ...extra,
});

describe("buildItemsList", () => {
  it("returns works array unchanged when items=issues", () => {
    const works = [w("a", "REBELLION"), w("b", "REBELLION")];
    expect(buildItemsList(works, [], "issues")).toEqual([
      { kind: "work", work: works[0] },
      { kind: "work", work: works[1] },
    ]);
  });

  it("issues mode maps all works including members", () => {
    const works = [
      w("a", "REBELLION"),
      w("b", "REBELLION"),
    ];
    const c = dc("c1", ["a"]);
    const items = buildItemsList(works, [c], "issues");
    expect(items).toEqual([
      { kind: "work", work: works[0] },
      { kind: "work", work: works[1] },
    ]);
  });

  it("collections mode: member works are excluded; collection appears once; non-member works appear", () => {
    const works = [
      w("m1", "REBELLION"),
      w("m2", "REBELLION"),
      w("loose", "REBELLION"),
    ];
    const c = dc("c1", ["m1", "m2"]);
    const items = buildItemsList(works, [c], "collections");
    expect(items).toEqual([
      { kind: "collection", collection: c },
      { kind: "work", work: works[2] },
    ]);
  });

  it("collections mode: each collection appears exactly once", () => {
    const works = [
      w("a", "REBELLION"),
      w("b", "REBELLION"),
    ];
    const c1 = dc("c1", ["a"]);
    const c2 = dc("c2", ["b"]);
    const items = buildItemsList(works, [c1, c2], "collections");
    const collectionIds = items
      .filter((i) => i.kind === "collection")
      .map((i) => (i as { kind: "collection"; collection: DerivedCollection }).collection.id);
    expect(collectionIds).toEqual(["c1", "c2"]);
    // No duplicates.
    expect(new Set(collectionIds).size).toBe(2);
  });

  it("collections mode: non-member works appear after collections", () => {
    const works = [
      w("member", "REBELLION"),
      w("loose", "REBELLION"),
    ];
    const c = dc("c1", ["member"]);
    const items = buildItemsList(works, [c], "collections");
    expect(items[0]).toEqual({ kind: "collection", collection: c });
    expect(items[1]).toEqual({ kind: "work", work: works[1] });
  });

  it("collections mode: work in multiple collections is excluded from loose works", () => {
    const works = [
      w("shared", "REBELLION"),
      w("only-c1", "REBELLION"),
    ];
    const c1 = dc("c1", ["shared", "only-c1"]);
    const c2 = dc("c2", ["shared"]);
    const items = buildItemsList(works, [c1, c2], "collections");
    // Both collections appear, no loose works.
    expect(items).toEqual([
      { kind: "collection", collection: c1 },
      { kind: "collection", collection: c2 },
    ]);
  });

  it("collections mode: works with no collections at all appear as loose", () => {
    const works = [w("a", "REBELLION")];
    const items = buildItemsList(works, [], "collections");
    expect(items).toEqual([{ kind: "work", work: works[0] }]);
  });
});
