import { describe, expect, it } from "vitest";
import { resolveWorkCover } from "../resolveWorkCover";
import type { Work } from "../../types/work";

const w = (over: Partial<Work> = {}): Work =>
  ({ id: "w1", era: "REBELLION", title: "T", medium: "Novel", year: 0, ...over }) as Work;

describe("resolveWorkCover", () => {
  it("uses the work's own cover when present (not borrowed)", () => {
    expect(resolveWorkCover(w({ cover_url: "own.jpg" }), new Map([["w1", "coll.jpg"]])))
      .toEqual({ src: "own.jpg", borrowed: false });
  });
  it("borrows from a user collection when the work has no cover", () => {
    expect(resolveWorkCover(w(), new Map([["w1", "coll.jpg"]])))
      .toEqual({ src: "coll.jpg", borrowed: true });
  });
  it("returns null when there is no cover anywhere", () => {
    expect(resolveWorkCover(w(), new Map())).toEqual({ src: null, borrowed: false });
  });
});
