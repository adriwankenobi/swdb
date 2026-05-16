import { useRef, useMemo, useEffect, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { WorkCard } from "@/components/work/WorkCard";
import { useFilterStore } from "@/store/filterStore";
import { useScrollResetOnFilterChange } from "@/lib/useScrollResetOnFilterChange";
import { computeColumnCount } from "@/lib/computeColumnCount";
import type { Item } from "@/lib/buildItemsList";

const ROW_HEIGHT = 360;     // approximate card height + gap

function useResponsiveColumns(parentRef: React.RefObject<HTMLDivElement | null>) {
  const [cols, setCols] = useState(4);
  useEffect(() => {
    if (!parentRef.current) return;
    const el = parentRef.current;
    const update = () => setCols(computeColumnCount(el.clientWidth, window.innerWidth));
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    window.addEventListener("resize", update);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", update);
    };
  }, [parentRef]);
  return cols;
}

export function CardGrid({ items }: { items: Item[] }) {
  const parentRef = useRef<HTMLDivElement>(null);
  const cols = useResponsiveColumns(parentRef);
  const set = useFilterStore((s) => s.set);
  useScrollResetOnFilterChange(parentRef);

  const rows = useMemo(() => {
    const arr: Item[][] = [];
    for (let i = 0; i < items.length; i += cols) {
      arr.push(items.slice(i, i + cols));
    }
    return arr;
  }, [items, cols]);

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 4,
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
      <div style={{ height: virtualizer.getTotalSize(), position: "relative", width: "100%" }}>
        {virtualizer.getVirtualItems().map((vr) => (
          <div
            key={vr.key}
            data-index={vr.index}
            ref={virtualizer.measureElement}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              transform: `translateY(${vr.start}px)`,
            }}
          >
            <div
              className="grid gap-4 pb-4"
              style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
            >
              {rows[vr.index].map((item) =>
                item.kind === "work" ? (
                  <WorkCard
                    key={item.work.id}
                    work={item.work}
                    onClick={() => set({ openWorkId: item.work.id })}
                  />
                ) : (
                  <button
                    key={item.collection.id}
                    onClick={() => set({ openWorkId: null, openCollectionId: item.collection.id })}
                    className="rounded border bg-card p-2 text-sm text-left"
                  >
                    {item.collection.title}
                  </button>
                )
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
