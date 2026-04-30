import { describe, expect, it } from "vitest";
import type { Work } from "../../types/work";
import type { EraName } from "../../constants/eras";
import { groupForChronology, groupForRelease } from "../timelineGroups";

const REBELLION: EraName = "REBELLION";              // ERAS index 5
const NEW_JEDI_ORDER: EraName = "NEW JEDI ORDER";    // ERAS index 7
const PRE_REPUBLIC: EraName = "PRE-REPUBLIC";        // ERAS index 0
const THE_CLONE_WARS: EraName = "THE CLONE WARS";    // ERAS index 3
const OLD_REPUBLIC: EraName = "OLD REPUBLIC";        // ERAS index 1

const w = (over: Partial<Work> & { id: string; year: number }): Work => ({
  era: REBELLION,
  title: "T",
  medium: "Novel",
  ...over,
});

describe("groupForChronology", () => {
  it("groups by era ascending; rows follow Excel order, not year order", () => {
    const works: Work[] = [
      w({ id: "b", era: NEW_JEDI_ORDER, year: 25 }),
      w({ id: "a", era: REBELLION, year: 0 }),
      w({ id: "c", era: NEW_JEDI_ORDER, year: 10 }), // year 10 < 25 but appears AFTER "b" in Excel
      w({ id: "d", era: REBELLION, year: 0 }),  // same span as "a", contiguous → coalesces
    ];
    const groups = groupForChronology(works);
    expect(groups.map((g) => g.eraName)).toEqual([REBELLION, NEW_JEDI_ORDER]);

    // Era 5: single row (a + d coalesced; both year 0).
    const era5 = groups[0];
    expect(era5.rows).toHaveLength(1);
    expect(era5.rows[0].year).toBe(0);
    expect(era5.rows[0].works.map((w) => w.id)).toEqual(["a", "d"]);

    // Era 7: rows in Excel order — "b" (year 25) THEN "c" (year 10), not year-sorted.
    const era7 = groups[1];
    expect(era7.rows.map((r) => r.year)).toEqual([25, 10]);
    expect(era7.rows[0].works.map((w) => w.id)).toEqual(["b"]);
    expect(era7.rows[1].works.map((w) => w.id)).toEqual(["c"]);
  });

  it("non-contiguous same-year works produce separate rows", () => {
    const works: Work[] = [
      w({ id: "early1", era: REBELLION, year: 0 }),
      w({ id: "later",  era: REBELLION, year: 5 }), // breaks the run
      w({ id: "early2", era: REBELLION, year: 0 }),
    ];
    const groups = groupForChronology(works);
    const rows = groups[0].rows;
    expect(rows.map((r) => r.year)).toEqual([0, 5, 0]);
    expect(rows[0].works.map((w) => w.id)).toEqual(["early1"]);
    expect(rows[1].works.map((w) => w.id)).toEqual(["later"]);
    expect(rows[2].works.map((w) => w.id)).toEqual(["early2"]);
  });

  it("coalesces consecutive range works with the same span", () => {
    const works: Work[] = [
      w({ id: "r1", era: OLD_REPUBLIC, year: -3996, year_end: -3994 }),
      w({ id: "r2", era: OLD_REPUBLIC, year: -3996, year_end: -3994 }),
      w({ id: "single", era: OLD_REPUBLIC, year: -3996 }), // same start, no end → different span
    ];
    const groups = groupForChronology(works);
    const rows = groups[0].rows;
    expect(rows).toHaveLength(2);
    expect(rows[0].year).toBe(-3996);
    expect(rows[0].year_end).toBe(-3994);
    expect(rows[0].works.map((w) => w.id)).toEqual(["r1", "r2"]);
    expect(rows[1].year).toBe(-3996);
    expect(rows[1].year_end).toBeUndefined();
    expect(rows[1].works.map((w) => w.id)).toEqual(["single"]);
  });

  it("excludes nothing — every work appears exactly once", () => {
    const works: Work[] = [
      w({ id: "x", era: PRE_REPUBLIC, year: -25000 }),
      w({ id: "y", era: THE_CLONE_WARS, year: -22 }),
      w({ id: "z", era: REBELLION, year: 4 }),
    ];
    const groups = groupForChronology(works);
    const allWorks = groups.flatMap((g) => g.rows.flatMap((r) => r.works));
    expect(allWorks).toHaveLength(3);
    const ids = allWorks.map((w) => w.id).sort();
    expect(ids).toEqual(["x", "y", "z"]);
  });
});

describe("groupForRelease", () => {
  it("puts dated works in ascending year order", () => {
    const works: Work[] = [
      w({ id: "c", year: 0, release_date: "2010-05-01" }),
      w({ id: "a", year: 0, release_date: "1977-05-25" }),
      w({ id: "b", year: 0, release_date: "1999-11-11" }),
    ];
    const groups = groupForRelease(works);
    expect(groups.map((g) => g.year)).toEqual([1977, 1999, 2010]);
    expect(groups[0].works.map((w) => w.id)).toEqual(["a"]);
  });

  it("collects undated works in a final null-year bucket", () => {
    const works: Work[] = [
      w({ id: "dated", year: 0, release_date: "2005-03-19" }),
      w({ id: "nodateA", year: 1 }),
      w({ id: "nodateB", year: 2 }),
    ];
    const groups = groupForRelease(works);
    // Last group is the null bucket
    const last = groups[groups.length - 1];
    expect(last.year).toBeNull();
    expect(last.works.map((w) => w.id)).toEqual(["nodateA", "nodateB"]);
    // Dated group comes first
    expect(groups[0].year).toBe(2005);
  });

  it("empty input → empty output", () => {
    expect(groupForRelease([])).toEqual([]);
  });
});
