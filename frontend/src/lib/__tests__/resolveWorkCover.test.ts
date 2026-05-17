import { describe, it, expect } from "vitest";
import { resolveWorkCover } from "../resolveWorkCover";
import type { Work, Collection } from "@/types/work";

function work(overrides: Partial<Work> = {}): Work {
  return {
    id: "w1",
    era: "REBELLION",
    title: "T",
    medium: "Comic",
    year: 0,
    ...overrides,
  };
}

function coll(id: string, cover?: string): Collection {
  return {
    id,
    title: "Collection " + id,
    eras: ["REBELLION"],
    mediums: ["Comic"],
    year: 0,
    anchor_year: 0,
    anchor_era: "REBELLION",
    anchor_member_id: "w1",
    member_ids: ["w1"],
    ...(cover ? { cover_url: cover } : {}),
  };
}

describe("resolveWorkCover", () => {
  it("returns the work's own cover when present, ignoring collection covers", () => {
    const w = work({ cover_url: "own.jpg", collection_ids: ["c1"] });
    const idx = new Map([["c1", coll("c1", "c1.jpg")]]);
    expect(resolveWorkCover(w, idx)).toEqual({ src: "own.jpg", borrowed: false });
  });

  it("returns the only collection's cover with borrowed=true when work has none", () => {
    const w = work({ collection_ids: ["c1"] });
    const idx = new Map([["c1", coll("c1", "c1.jpg")]]);
    expect(resolveWorkCover(w, idx)).toEqual({ src: "c1.jpg", borrowed: true });
  });

  it("borrows from the first collection in collection_ids order", () => {
    const w = work({ collection_ids: ["c1", "c2"] });
    const idx = new Map([
      ["c1", coll("c1", "first.jpg")],
      ["c2", coll("c2", "second.jpg")],
    ]);
    expect(resolveWorkCover(w, idx)).toEqual({ src: "first.jpg", borrowed: true });
  });

  it("skips cover-less collections and uses the next one with a cover", () => {
    const w = work({ collection_ids: ["c1", "c2"] });
    const idx = new Map([
      ["c1", coll("c1")],
      ["c2", coll("c2", "second.jpg")],
    ]);
    expect(resolveWorkCover(w, idx)).toEqual({ src: "second.jpg", borrowed: true });
  });

  it("returns { src: null, borrowed: false } when no cover exists anywhere", () => {
    const w = work({ collection_ids: ["c1", "c2"] });
    const idx = new Map([
      ["c1", coll("c1")],
      ["c2", coll("c2")],
    ]);
    expect(resolveWorkCover(w, idx)).toEqual({ src: null, borrowed: false });
  });

  it("handles collection_ids === undefined", () => {
    const w = work();
    const idx = new Map<string, Collection>();
    expect(resolveWorkCover(w, idx)).toEqual({ src: null, borrowed: false });
  });

  it("handles collection_ids === []", () => {
    const w = work({ collection_ids: [] });
    const idx = new Map<string, Collection>();
    expect(resolveWorkCover(w, idx)).toEqual({ src: null, borrowed: false });
  });

  it("skips orphan ids that aren't in collectionsById", () => {
    const w = work({ collection_ids: ["orphan", "c2"] });
    const idx = new Map([["c2", coll("c2", "c2.jpg")]]);
    expect(resolveWorkCover(w, idx)).toEqual({ src: "c2.jpg", borrowed: true });
  });
});
