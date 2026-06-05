import { useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { WorkRow } from "@/components/work/WorkRow";
import { CollectionRow } from "@/components/work/CollectionRow";
import { useFilterStore } from "@/store/filterStore";
import { useUserStore } from "@/store/userStore";
import { useScrollResetOnFilterChange } from "@/lib/useScrollResetOnFilterChange";
import type { Item } from "@/lib/buildItemsList";
import { COLUMNS, OWNED_COLUMN_WIDTH } from "./_tableColumns";

const ROW_HEIGHT = 56; // px

interface TableViewProps {
  items: Item[];
}

export function TableView({ items }: TableViewProps) {
  const parentRef = useRef<HTMLDivElement>(null);
  const set = useFilterStore((s) => s.set);
  const itemsMode = useFilterStore((s) => s.items);
  const signedIn = useUserStore((s) => s.session !== null);
  // The owned column only applies in issues mode (hidden in collections mode).
  const showOwnedColumn = signedIn && itemsMode !== "collections";
  useScrollResetOnFilterChange(parentRef);

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 8,
  });

  if (items.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        No works match these filters.
      </div>
    );
  }

  return (
    <div ref={parentRef} className="h-full overflow-auto">
      <div className="min-w-fit">
        {/* Sticky header */}
        <div className="sticky top-0 z-10 flex border-b bg-background text-xs uppercase text-muted-foreground">
          {COLUMNS.map((col) => (
            <div
              key={col.key}
              className={`shrink-0 px-2 py-2 ${col.width} ${
                col.key === "cover" ? "sticky left-0 z-20 bg-background" : ""
              }`}
            >
              {col.label}
            </div>
          ))}
          {showOwnedColumn && (
            <div className={`shrink-0 px-2 py-2 ${OWNED_COLUMN_WIDTH}`}>Owned</div>
          )}
        </div>

        {/* Virtualized rows */}
        <div style={{ height: virtualizer.getTotalSize(), position: "relative" }}>
          {virtualizer.getVirtualItems().map((vr) => {
            const item = items[vr.index];
            return (
              <div
                key={vr.key}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  transform: `translateY(${vr.start}px)`,
                  height: ROW_HEIGHT,
                }}
              >
                {item.kind === "work" ? (
                  <WorkRow
                    work={item.work}
                    onClick={() => set({ openWorkId: item.work.id })}
                  />
                ) : (
                  <CollectionRow
                    collection={item.collection}
                    onClick={() => set({ openCollectionId: item.collection.id, openWorkId: null })}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
