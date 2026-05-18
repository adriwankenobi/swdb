import { useFilterStore } from "@/store/filterStore";
import { computeNeighbors } from "./computeNeighbors";
import type { Item } from "./buildItemsList";

export interface ModalNeighbors {
  hasPrev: boolean;
  hasNext: boolean;
  isOrphan: boolean;
  goPrev: () => void;
  goNext: () => void;
}

export function useModalNeighbors(
  visibleItems: Item[],
  openWorkId: string | null,
  openCollectionId: string | null,
): ModalNeighbors {
  const set = useFilterStore((s) => s.set);
  const { prevItem, nextItem, isOrphan } = computeNeighbors(
    visibleItems,
    openWorkId,
    openCollectionId,
  );
  function openItem(item: Item) {
    if (item.kind === "work") {
      set({ openWorkId: item.work.id, openCollectionId: null });
    } else {
      set({ openWorkId: null, openCollectionId: item.collection.id });
    }
  }
  return {
    hasPrev: prevItem !== null,
    hasNext: nextItem !== null,
    isOrphan,
    goPrev: () => { if (prevItem) openItem(prevItem); },
    goNext: () => { if (nextItem) openItem(nextItem); },
  };
}
