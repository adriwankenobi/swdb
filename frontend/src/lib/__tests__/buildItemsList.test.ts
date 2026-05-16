import { describe, it, expect } from "vitest";
import { buildItemsList } from "../buildItemsList";
import type { Work, Collection } from "../../types/work";

const w = (id: string, era: Work["era"], extra: Partial<Work> = {}): Work => ({
  id, era, title: id, medium: "Comic", year: 0, ...extra,
});

describe("buildItemsList", () => {
  it("returns works array unchanged when items=issues", () => {
    const works = [w("a", "REBELLION"), w("b", "REBELLION")];
    expect(buildItemsList(works, [], "issues")).toEqual([
      { kind: "work", work: works[0] },
      { kind: "work", work: works[1] },
    ]);
  });

  it("inserts a collection at its anchor_member position and drops members", () => {
    const works = [
      w("a", "REBELLION", { collection_ids: ["c1"] }),
      w("b", "REBELLION", { collection_ids: ["c1"] }),
      w("c", "REBELLION"),
    ];
    const c: Collection = {
      id: "c1", title: "C1", eras: ["REBELLION"], mediums: ["Comic"],
      year: 0, anchor_year: 0, anchor_era: "REBELLION",
      anchor_member_id: "b", member_ids: ["a", "b"],
    };
    const items = buildItemsList(works, [c], "collections");
    expect(items).toEqual([
      // 'a' is a member of c1 but not the anchor → skipped.
      { kind: "collection", collection: c },
      { kind: "work", work: works[2] },
    ]);
  });

  it("pushes multiple collections when one work anchors several", () => {
    // 'b' anchors both c1 and c2.
    const works = [
      w("a", "REBELLION", { collection_ids: ["c1"] }),
      w("b", "REBELLION", { collection_ids: ["c1", "c2"] }),
      w("c", "REBELLION", { collection_ids: ["c2"] }),
    ];
    const c1: Collection = {
      id: "c1", title: "C1", eras: ["REBELLION"], mediums: ["Comic"],
      year: 0, anchor_year: 0, anchor_era: "REBELLION",
      anchor_member_id: "b", member_ids: ["a", "b"],
    };
    const c2: Collection = {
      id: "c2", title: "C2", eras: ["REBELLION"], mediums: ["Comic"],
      year: 0, anchor_year: 0, anchor_era: "REBELLION",
      anchor_member_id: "b", member_ids: ["b", "c"],
    };
    const items = buildItemsList(works, [c1, c2], "collections");
    expect(items).toEqual([
      { kind: "collection", collection: c1 },
      { kind: "collection", collection: c2 },
    ]);
  });

  it("appends orphan collections (anchor_member_id not in works) at the end", () => {
    const works = [w("a", "REBELLION")];
    const c: Collection = {
      id: "c-orphan", title: "Orphan", eras: ["REBELLION"], mediums: ["Comic"],
      year: 0, anchor_year: 0, anchor_era: "REBELLION",
      anchor_member_id: "missing", member_ids: ["missing"],
    };
    const items = buildItemsList(works, [c], "collections");
    expect(items[items.length - 1]).toEqual({ kind: "collection", collection: c });
  });
});
