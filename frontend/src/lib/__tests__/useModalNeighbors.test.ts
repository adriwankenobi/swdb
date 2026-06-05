import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Item } from "../buildItemsList";
import type { Work, DerivedCollection } from "@/types/work";

const setSpy = vi.fn();

vi.mock("@/store/filterStore", () => ({
  useFilterStore: <T,>(selector: (state: { set: typeof setSpy }) => T): T =>
    selector({ set: setSpy }),
}));

// Import AFTER vi.mock so the hook sees the mocked store.
import { useModalNeighbors } from "../useModalNeighbors";

function w(id: string): Work {
  return { id, era: "REBELLION", title: id, medium: "Comic", year: 0 };
}

function c(id: string): DerivedCollection {
  return {
    id,
    title: id,
    eras: ["REBELLION"],
    mediums: ["Comic"],
    series: [],
    authors: [],
    publishers: [],
    year: 0,
    anchor_era: "REBELLION",
    member_ids: ["x"],
  };
}

const itemW = (id: string): Item => ({ kind: "work", work: w(id) });
const itemC = (id: string): Item => ({ kind: "collection", collection: c(id) });

describe("useModalNeighbors", () => {
  beforeEach(() => {
    setSpy.mockClear();
  });

  it("goPrev to a work clears openCollectionId", () => {
    const items: Item[] = [itemW("a"), itemW("b")];
    const { goPrev } = useModalNeighbors(items, "b", null);
    goPrev();
    expect(setSpy).toHaveBeenCalledWith({ openWorkId: "a", openCollectionId: null });
  });

  it("goPrev to a collection clears openWorkId", () => {
    const items: Item[] = [itemC("c1"), itemW("b")];
    const { goPrev } = useModalNeighbors(items, "b", null);
    goPrev();
    expect(setSpy).toHaveBeenCalledWith({ openWorkId: null, openCollectionId: "c1" });
  });

  it("goNext to a collection clears openWorkId", () => {
    const items: Item[] = [itemW("a"), itemC("c1")];
    const { goNext } = useModalNeighbors(items, "a", null);
    goNext();
    expect(setSpy).toHaveBeenCalledWith({ openWorkId: null, openCollectionId: "c1" });
  });

  it("goPrev is a no-op at the first index", () => {
    const items: Item[] = [itemW("a"), itemW("b")];
    const { goPrev } = useModalNeighbors(items, "a", null);
    goPrev();
    expect(setSpy).not.toHaveBeenCalled();
  });

  it("goNext is a no-op at the last index", () => {
    const items: Item[] = [itemW("a"), itemW("b")];
    const { goNext } = useModalNeighbors(items, "b", null);
    goNext();
    expect(setSpy).not.toHaveBeenCalled();
  });

  it("goPrev and goNext are no-ops when the open item is orphan", () => {
    const items: Item[] = [itemW("a"), itemW("b")];
    const { goPrev, goNext, isOrphan } = useModalNeighbors(items, "z", null);
    expect(isOrphan).toBe(true);
    goPrev();
    goNext();
    expect(setSpy).not.toHaveBeenCalled();
  });

  it("exposes hasPrev/hasNext correctly", () => {
    const items: Item[] = [itemW("a"), itemW("b"), itemW("c")];
    expect(useModalNeighbors(items, "a", null).hasPrev).toBe(false);
    expect(useModalNeighbors(items, "a", null).hasNext).toBe(true);
    expect(useModalNeighbors(items, "c", null).hasPrev).toBe(true);
    expect(useModalNeighbors(items, "c", null).hasNext).toBe(false);
  });
});
