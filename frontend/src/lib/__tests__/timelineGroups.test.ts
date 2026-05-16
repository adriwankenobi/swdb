import { describe, expect, it } from "vitest";
import type { Work, Collection } from "../../types/work";
import type { Item } from "../buildItemsList";
import type { EraName } from "../../constants/eras";
import { groupForChronology, groupForRelease } from "../timelineGroups";

const REBELLION: EraName = "REBELLION";              // ERAS index 5
const NEW_JEDI_ORDER: EraName = "NEW JEDI ORDER";    // ERAS index 7
const PRE_REPUBLIC: EraName = "PRE-REPUBLIC";        // ERAS index 0
const THE_CLONE_WARS: EraName = "THE CLONE WARS";    // ERAS index 3
const OLD_REPUBLIC: EraName = "OLD REPUBLIC";        // ERAS index 1
const RISE_OF_THE_EMPIRE: EraName = "RISE OF THE EMPIRE"; // ERAS index 2

const w = (over: Partial<Work> & { id: string; year: number }): Work => ({
  era: REBELLION,
  title: "T",
  medium: "Novel",
  ...over,
});

// Wrap a Work as a work Item.
const wi = (work: Work): Item => ({ kind: "work", work });

// Build a minimal Collection item.
const ci = (
  over: Partial<Collection> & { id: string; year: number; anchor_era: EraName },
): Item => ({
  kind: "collection",
  collection: {
    title: "C",
    eras: [over.anchor_era],
    mediums: ["Novel"],
    anchor_year: over.year,
    anchor_member_id: "m1",
    member_ids: ["m1"],
    ...over,
  } as Collection,
});

describe("groupForChronology", () => {
  it("groups by era ascending; rows follow Excel order, not year order", () => {
    const items: Item[] = [
      wi(w({ id: "b", era: NEW_JEDI_ORDER, year: 25 })),
      wi(w({ id: "a", era: REBELLION, year: 0 })),
      wi(w({ id: "c", era: NEW_JEDI_ORDER, year: 10 })), // year 10 < 25 but appears AFTER "b" in Excel
      wi(w({ id: "d", era: REBELLION, year: 0 })),  // same span as "a", contiguous → coalesces
    ];
    const groups = groupForChronology(items);
    expect(groups.map((g) => g.era)).toEqual([REBELLION, NEW_JEDI_ORDER]);

    // Era 5: single row (a + d coalesced; both year 0).
    const era5 = groups[0];
    expect(era5.rows).toHaveLength(1);
    expect(era5.rows[0].year).toBe(0);
    expect(era5.rows[0].items.map((i) => (i.kind === "work" ? i.work.id : i.collection.id))).toEqual(["a", "d"]);

    // Era 7: rows in Excel order — "b" (year 25) THEN "c" (year 10), not year-sorted.
    const era7 = groups[1];
    expect(era7.rows.map((r) => r.year)).toEqual([25, 10]);
    expect(era7.rows[0].items.map((i) => (i.kind === "work" ? i.work.id : i.collection.id))).toEqual(["b"]);
    expect(era7.rows[1].items.map((i) => (i.kind === "work" ? i.work.id : i.collection.id))).toEqual(["c"]);
  });

  it("non-contiguous same-year works produce separate rows", () => {
    const items: Item[] = [
      wi(w({ id: "early1", era: REBELLION, year: 0 })),
      wi(w({ id: "later",  era: REBELLION, year: 5 })), // breaks the run
      wi(w({ id: "early2", era: REBELLION, year: 0 })),
    ];
    const groups = groupForChronology(items);
    const rows = groups[0].rows;
    expect(rows.map((r) => r.year)).toEqual([0, 5, 0]);
    expect(rows[0].items.map((i) => (i.kind === "work" ? i.work.id : i.collection.id))).toEqual(["early1"]);
    expect(rows[1].items.map((i) => (i.kind === "work" ? i.work.id : i.collection.id))).toEqual(["later"]);
    expect(rows[2].items.map((i) => (i.kind === "work" ? i.work.id : i.collection.id))).toEqual(["early2"]);
  });

  it("coalesces consecutive range works with the same span", () => {
    const items: Item[] = [
      wi(w({ id: "r1", era: OLD_REPUBLIC, year: -3996, year_end: -3994 })),
      wi(w({ id: "r2", era: OLD_REPUBLIC, year: -3996, year_end: -3994 })),
      wi(w({ id: "single", era: OLD_REPUBLIC, year: -3996 })), // same start, no end → different span
    ];
    const groups = groupForChronology(items);
    const rows = groups[0].rows;
    expect(rows).toHaveLength(2);
    expect(rows[0].year).toBe(-3996);
    expect(rows[0].year_end).toBe(-3994);
    expect(rows[0].items.map((i) => (i.kind === "work" ? i.work.id : i.collection.id))).toEqual(["r1", "r2"]);
    expect(rows[1].year).toBe(-3996);
    expect(rows[1].year_end).toBeUndefined();
    expect(rows[1].items.map((i) => (i.kind === "work" ? i.work.id : i.collection.id))).toEqual(["single"]);
  });

  it("excludes nothing — every item appears exactly once", () => {
    const items: Item[] = [
      wi(w({ id: "x", era: PRE_REPUBLIC, year: -25000 })),
      wi(w({ id: "y", era: THE_CLONE_WARS, year: -22 })),
      wi(w({ id: "z", era: REBELLION, year: 4 })),
    ];
    const groups = groupForChronology(items);
    const allItems = groups.flatMap((g) => g.rows.flatMap((r) => r.items));
    expect(allItems).toHaveLength(3);
    const ids = allItems.map((i) => (i.kind === "work" ? i.work.id : i.collection.id)).sort();
    expect(ids).toEqual(["x", "y", "z"]);
  });

  it("collection item bands by anchor_era", () => {
    // A collection whose anchor_era is RISE_OF_THE_EMPIRE should appear in that era group,
    // even when mixed with a work in REBELLION.
    const items: Item[] = [
      wi(w({ id: "w1", era: REBELLION, year: 0 })),
      ci({ id: "coll1", year: -22, anchor_era: RISE_OF_THE_EMPIRE }),
    ];
    const groups = groupForChronology(items);
    // RISE_OF_THE_EMPIRE (index 2) < REBELLION (index 5), so it comes first.
    expect(groups.map((g) => g.era)).toEqual([RISE_OF_THE_EMPIRE, REBELLION]);
    const riseGroup = groups[0];
    expect(riseGroup.rows).toHaveLength(1);
    expect(riseGroup.rows[0].items[0].kind).toBe("collection");
    const rebellionGroup = groups[1];
    expect(rebellionGroup.rows[0].items[0].kind).toBe("work");
  });
});

describe("groupForRelease", () => {
  it("puts dated items in ascending year order", () => {
    const items: Item[] = [
      wi(w({ id: "c", year: 0, release_date: "2010-05-01" })),
      wi(w({ id: "a", year: 0, release_date: "1977-05-25" })),
      wi(w({ id: "b", year: 0, release_date: "1999-11-11" })),
    ];
    const groups = groupForRelease(items);
    expect(groups.map((g) => g.year)).toEqual([1977, 1999, 2010]);
    expect(groups[0].items.map((i) => (i.kind === "work" ? i.work.id : i.collection.id))).toEqual(["a"]);
  });

  it("collects undated items in a final null-year bucket", () => {
    const items: Item[] = [
      wi(w({ id: "dated", year: 0, release_date: "2005-03-19" })),
      wi(w({ id: "nodateA", year: 1 })),
      wi(w({ id: "nodateB", year: 2 })),
    ];
    const groups = groupForRelease(items);
    // Last group is the null bucket
    const last = groups[groups.length - 1];
    expect(last.year).toBeNull();
    expect(last.items.map((i) => (i.kind === "work" ? i.work.id : i.collection.id))).toEqual(["nodateA", "nodateB"]);
    // Dated group comes first
    expect(groups[0].year).toBe(2005);
  });

  it("empty input → empty output", () => {
    expect(groupForRelease([])).toEqual([]);
  });

  it("collection item uses its own release_date for bucketing", () => {
    const items: Item[] = [
      ci({ id: "coll1", year: -22, anchor_era: REBELLION, release_date: "2003-07-01" }),
      wi(w({ id: "w1", year: 0, release_date: "2003-11-01" })),
    ];
    const groups = groupForRelease(items);
    // Both fall in real-year 2003.
    expect(groups).toHaveLength(1);
    expect(groups[0].year).toBe(2003);
    expect(groups[0].items).toHaveLength(2);
  });
});
