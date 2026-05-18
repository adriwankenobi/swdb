import type { Item } from "./buildItemsList";

export interface Neighbors {
  prevItem: Item | null;
  nextItem: Item | null;
  isOrphan: boolean;
}

export function computeNeighbors(
  items: Item[],
  openWorkId: string | null,
  openCollectionId: string | null,
): Neighbors {
  const hasOpenId = openWorkId !== null || openCollectionId !== null;
  if (!hasOpenId) {
    return { prevItem: null, nextItem: null, isOrphan: false };
  }
  const index = items.findIndex((item) => {
    if (item.kind === "work") return openWorkId !== null && item.work.id === openWorkId;
    return openCollectionId !== null && item.collection.id === openCollectionId;
  });
  if (index === -1) {
    return { prevItem: null, nextItem: null, isOrphan: true };
  }
  return {
    prevItem: index > 0 ? items[index - 1] : null,
    nextItem: index < items.length - 1 ? items[index + 1] : null,
    isOrphan: false,
  };
}
