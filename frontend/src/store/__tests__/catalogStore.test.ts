import { describe, expect, it } from "vitest";
import { buildFacets } from "../catalogStore";
import type { Collection, Work } from "../../types/work";

function mkCollection(id: string, title: string, memberIds: string[]): Collection {
  return {
    id,
    title,
    eras: ["REBELLION"],
    mediums: ["Comic"],
    year: 0,
    anchor_year: 0,
    anchor_era: "REBELLION",
    anchor_member_id: memberIds[0] ?? "",
    member_ids: memberIds,
  };
}

describe("buildFacets — collections", () => {
  it("sorts collections by member count desc, then title asc", () => {
    const works: Work[] = [];
    const collections: Collection[] = [
      mkCollection("c-small", "Alpha (TPB)", ["w1"]),
      mkCollection("c-big-z", "Zeta (TPB)", ["w1", "w2", "w3"]),
      mkCollection("c-big-a", "Beta (TPB)", ["w1", "w2", "w3"]),
      mkCollection("c-mid", "Gamma (TPB)", ["w1", "w2"]),
    ];
    const f = buildFacets(works, collections).collections;
    expect(f.map((x) => x.label)).toEqual([
      "Beta (TPB)",  // count 3, label A < Z
      "Zeta (TPB)",  // count 3
      "Gamma (TPB)", // count 2
      "Alpha (TPB)", // count 1
    ]);
    expect(f.map((x) => x.count)).toEqual([3, 3, 2, 1]);
  });
});
