import { describe, expect, it } from "vitest";
import { readFromUrl, writeToUrl } from "../urlState";
import type { FilterState } from "../../store/filterStore";

const empty: FilterState = {
  eras: [], mediums: [], series: [], authors: [], publishers: [],
  q: "", yearMin: null, yearMax: null, releaseMin: null, releaseMax: null,
  releaseUndated: false,
  view: "cards", sort: "chronology", openWorkId: null,
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

  it("reads era slugs back as canonical names", () => {
    const r = readFromUrl("?era=old-republic,rise-of-the-empire");
    expect(r.eras).toEqual(["OLD REPUBLIC", "RISE OF THE EMPIRE"]);
  });

  it("reads medium slugs back as canonical names", () => {
    const r = readFromUrl("?medium=tv-show,junior-novel");
    expect(r.mediums).toEqual(["TV Show", "Junior Novel"]);
  });

  it("round-trips a complex state without loss", () => {
    const state: FilterState = {
      ...empty,
      eras: ["REBELLION", "NEW JEDI ORDER"],
      mediums: ["Novel", "Comic"],
      q: "vader",
      yearMin: -5,
      yearMax: 25,
    };
    const round = readFromUrl(writeToUrl(state));
    expect(round.eras).toEqual(state.eras);
    expect(round.mediums).toEqual(state.mediums);
    expect(round.q).toBe(state.q);
    expect(round.yearMin).toBe(state.yearMin);
    expect(round.yearMax).toBe(state.yearMax);
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
});
