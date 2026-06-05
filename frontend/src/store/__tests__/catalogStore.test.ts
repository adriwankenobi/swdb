import { describe, expect, it } from "vitest";
import { buildFacets, UNCREDITED_AUTHOR_VALUE } from "../catalogStore";
import type { Work } from "../../types/work";

const w = (id: string, over: Partial<Work> = {}): Work => ({
  id, era: "REBELLION", title: id, medium: "Comic", year: 0, ...over,
});

describe("buildFacets — series", () => {
  it("counts series occurrences correctly", () => {
    const works: Work[] = [
      w("a", { series: ["Dark Empire"] }),
      w("b", { series: ["Dark Empire", "Tales of the Jedi"] }),
      w("c", { series: ["Tales of the Jedi"] }),
    ];
    const f = buildFacets(works).series;
    expect(f.find((x) => x.value === "Dark Empire")?.count).toBe(2);
    expect(f.find((x) => x.value === "Tales of the Jedi")?.count).toBe(2);
  });
});

describe("buildFacets — authors", () => {
  it("inserts Uncredited sentinel when works have no authors", () => {
    const works: Work[] = [
      w("a", { authors: ["Foster"] }),
      w("b"),
    ];
    const f = buildFacets(works).authors;
    const uncredited = f.find((x) => x.value === UNCREDITED_AUTHOR_VALUE);
    expect(uncredited).toBeDefined();
    expect(uncredited?.count).toBe(1);
  });

  it("does not include Uncredited when all works have authors", () => {
    const works: Work[] = [
      w("a", { authors: ["Foster"] }),
      w("b", { authors: ["Salvatore"] }),
    ];
    const f = buildFacets(works).authors;
    expect(f.find((x) => x.value === UNCREDITED_AUTHOR_VALUE)).toBeUndefined();
  });
});

describe("buildFacets — publishers", () => {
  it("counts publishers correctly", () => {
    const works: Work[] = [
      w("a", { publisher: "Dark Horse" }),
      w("b", { publisher: "Dark Horse" }),
      w("c", { publisher: "Bantam" }),
    ];
    const f = buildFacets(works).publishers;
    expect(f.find((x) => x.value === "Dark Horse")?.count).toBe(2);
    expect(f.find((x) => x.value === "Bantam")?.count).toBe(1);
  });
});

describe("buildFacets — mediums", () => {
  it("returns mediums in MEDIUMS canonical order", () => {
    const works: Work[] = [
      w("a", { medium: "Novel" }),
      w("b", { medium: "Comic" }),
      w("c", { medium: "Novel" }),
    ];
    const f = buildFacets(works).mediums;
    // Comic (index 0) < Novel (index 3) in MEDIUMS order
    expect(f[0].value).toBe("Comic");
    expect(f[1].value).toBe("Novel");
  });
});
