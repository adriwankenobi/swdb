import { describe, expect, it } from "vitest";
import type { Work } from "../../types/work";
import { groupForChronology, groupForRelease } from "../timelineGroups";

const w = (over: Partial<Work> & { id: string; year: number }): Work => ({
  era: 5,
  title: "T",
  medium: 3,
  ...over,
});

describe("groupForChronology", () => {
  it("returns groups in era index order, with year-sorted sub-buckets, preserving input order within ties", () => {
    const works: Work[] = [
      w({ id: "b", era: 7, year: 25 }),
      w({ id: "a", era: 5, year: 0 }),
      w({ id: "c", era: 7, year: 10 }),
      w({ id: "d", era: 5, year: 0 }), // tie with "a": input order preserved
    ];
    const groups = groupForChronology(works);
    expect(groups.map((g) => g.eraIndex)).toEqual([5, 7]);
    // Era 5: years sorted ascending
    const era5 = groups[0];
    expect(era5.years.map((y) => y.year)).toEqual([0]);
    // Within year 0, input order: a then d
    expect(era5.years[0].works.map((w) => w.id)).toEqual(["a", "d"]);
    // Era 7: year 10 before 25
    const era7 = groups[1];
    expect(era7.years.map((y) => y.year)).toEqual([10, 25]);
  });

  it("excludes nothing — every work appears exactly once", () => {
    const works: Work[] = [
      w({ id: "x", era: 0, year: -25000 }),
      w({ id: "y", era: 3, year: -22 }),
      w({ id: "z", era: 5, year: 4 }),
    ];
    const groups = groupForChronology(works);
    const allWorks = groups.flatMap((g) => g.years.flatMap((y) => y.works));
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
