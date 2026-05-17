import { describe, expect, it } from "vitest";
import { readFromUrl, writeToUrl } from "../urlState";
import type { FilterState } from "../../store/filterStore";

const empty: FilterState = {
  eras: [], mediums: [], decades: [], series: [], authors: [], publishers: [],
  collections: [],
  q: "",
  releaseUndated: false,
  view: "cards", sort: "chronology", items: "issues",
  openWorkId: null, openCollectionId: null,
};

describe("urlState", () => {
  it("writes era names as kebab-case slugs", () => {
    const qs = writeToUrl({ ...empty, eras: ["OLD REPUBLIC", "RISE OF THE EMPIRE"] });
    expect(qs).toBe("?era=old-republic%2Crise-of-the-empire");
  });

  it("writes medium names as kebab-case slugs", () => {
    const qs = writeToUrl({ ...empty, mediums: ["TV Show", "Junior Novel"] });
    expect(qs).toBe("?medium=tv-show%2Cjunior-novel");
  });

  it("writes decades as a CSV of integers", () => {
    const qs = writeToUrl({ ...empty, decades: [1990, 2010] });
    expect(qs).toBe("?decade=1990%2C2010");
  });

  it("reads era slugs back as canonical names", () => {
    const r = readFromUrl("?era=old-republic,rise-of-the-empire");
    expect(r.eras).toEqual(["OLD REPUBLIC", "RISE OF THE EMPIRE"]);
  });

  it("reads medium slugs back as canonical names", () => {
    const r = readFromUrl("?medium=tv-show,junior-novel");
    expect(r.mediums).toEqual(["TV Show", "Junior Novel"]);
  });

  it("reads decade integers back", () => {
    const r = readFromUrl("?decade=1990,2010");
    expect(r.decades).toEqual([1990, 2010]);
  });

  it("drops non-numeric decade values", () => {
    const r = readFromUrl("?decade=1990,bogus,2010");
    expect(r.decades).toEqual([1990, 2010]);
  });

  it("round-trips a complex state without loss", () => {
    const state: FilterState = {
      ...empty,
      eras: ["REBELLION", "NEW JEDI ORDER"],
      mediums: ["Novel", "Comic"],
      decades: [1990, 2010],
      q: "vader",
    };
    const round = readFromUrl(writeToUrl(state));
    expect(round.eras).toEqual(state.eras);
    expect(round.mediums).toEqual(state.mediums);
    expect(round.decades).toEqual(state.decades);
    expect(round.q).toBe(state.q);
  });

  it("silently drops legacy integer era values from old bookmarks", () => {
    const r = readFromUrl("?era=1,2");
    expect(r.eras).toEqual([]);
  });

  it("silently drops legacy integer medium values from old bookmarks", () => {
    const r = readFromUrl("?medium=3,4");
    expect(r.mediums).toEqual([]);
  });

  it("silently drops unknown slugs", () => {
    const r = readFromUrl("?era=old-republic,bogus-era");
    expect(r.eras).toEqual(["OLD REPUBLIC"]);
  });

  it("silently ignores legacy year_min / year_max / release_min / release_max params", () => {
    const r = readFromUrl("?year_min=-5&year_max=25&release_min=1990-01-01&release_max=2010-12-31");
    expect(r.decades).toEqual([]);
    expect(r.eras).toEqual([]);
  });
});

describe("items param", () => {
  it("defaults to issues when absent", () => {
    expect(readFromUrl("").items).toBe("issues");
  });
  it("reads collections", () => {
    expect(readFromUrl("?items=collections").items).toBe("collections");
  });
  it("drops unknown values silently", () => {
    expect(readFromUrl("?items=garbage").items).toBe("issues");
  });
  it("omits param when default", () => {
    expect(writeToUrl({ ...empty, items: "issues" })).not.toContain("items=");
  });
  it("writes non-default value", () => {
    expect(writeToUrl({ ...empty, items: "collections" })).toContain("items=collections");
  });
});

describe("collection modal param", () => {
  it("reads collection id", () => {
    expect(readFromUrl("?collection=c-abc").openCollectionId).toBe("c-abc");
  });
  it("work param wins when both present", () => {
    const s = readFromUrl("?work=w-1&collection=c-1");
    expect(s.openWorkId).toBe("w-1");
    expect(s.openCollectionId).toBeNull();
  });
});

describe("collections facet param", () => {
  const slugMap = new Map<string, string>([
    ["dark-empire-tpb", "id-de"],
    ["heir-to-the-empire-tpb", "id-htte"],
  ]);
  const idMap = new Map<string, { title: string }>([
    ["id-de", { title: "Dark Empire (TPB)" }],
    ["id-htte", { title: "Heir to the Empire (TPB)" }],
  ]);

  it("reads slugs into ids when map is provided", () => {
    const r = readFromUrl("?collections=dark-empire-tpb,heir-to-the-empire-tpb", slugMap);
    expect(r.collections).toEqual(["id-de", "id-htte"]);
  });

  it("returns empty when map is omitted (boot-time read)", () => {
    const r = readFromUrl("?collections=dark-empire-tpb");
    expect(r.collections).toEqual([]);
  });

  it("drops unknown slugs silently", () => {
    const r = readFromUrl("?collections=dark-empire-tpb,bogus", slugMap);
    expect(r.collections).toEqual(["id-de"]);
  });

  it("writes ids back as slugs when map is provided", () => {
    const qs = writeToUrl({ ...empty, collections: ["id-de"] }, idMap);
    expect(qs).toContain("collections=dark-empire-tpb");
  });

  it("omits the param when no map is provided", () => {
    const qs = writeToUrl({ ...empty, collections: ["id-de"] });
    expect(qs).not.toContain("collections=");
    expect(qs).not.toContain("coll=");
  });

  it("never emits the legacy coll param", () => {
    const qs = writeToUrl({ ...empty, collections: ["id-de"] }, idMap);
    expect(qs).not.toContain("coll=");
  });

  it("ignores legacy coll= param on read", () => {
    const r = readFromUrl("?coll=id-de", slugMap);
    expect(r.collections).toEqual([]);
  });

  it("round-trips ids through slugs", () => {
    const state: FilterState = { ...empty, collections: ["id-de", "id-htte"] };
    const qs = writeToUrl(state, idMap);
    const round = readFromUrl(qs, slugMap);
    expect(round.collections).toEqual(state.collections);
  });
});
