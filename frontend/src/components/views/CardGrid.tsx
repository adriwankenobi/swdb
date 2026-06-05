import { useRef, useMemo, useEffect, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { WorkCard } from "@/components/work/WorkCard";
import { CollectionCard } from "@/components/work/CollectionCard";
import { useFilterStore } from "@/store/filterStore";
import { useScrollResetOnFilterChange } from "@/lib/useScrollResetOnFilterChange";
import { computeColumnCount } from "@/lib/computeColumnCount";
import type { Item } from "@/lib/buildItemsList";

const ROW_HEIGHT = 360;     // approximate card height + gap

function useResponsiveColumns(parentRef: React.RefObject<HTMLDivElement | null>) {
  const [cols, setCols] = useState(4);
  useEffect(() => {
    const el = parentRef.current;
    if (!el) return;
    const update = () => {
      const w = el.clientWidth;
      // Ignore pre-layout 0-width reads — otherwise cols collapses to 1
      // (giant single-column cards) on a fresh direct-URL mount.
      if (w === 0) return;
      setCols(computeColumnCount(w, window.innerWidth));
    };
    update();
    // Re-measure after the first paint in case layout wasn't settled yet.
    const raf = requestAnimationFrame(update);
    const ro = new ResizeObserver(update);
    ro.observe(el);
    window.addEventListener("resize", update);
    return () => {
      cancelAnimationFrame(raf);
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

  // The scroll container (with parentRef) is ALWAYS mounted so the
  // ResizeObserver attaches reliably even when items arrive async (e.g.
  // collections hydrating on a direct ?items=collections load).
  return (
    <div ref={parentRef} className="h-full overflow-auto">
      {items.length === 0 ? (
        <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
          No works match these filters.
        </div>
      ) : (
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
                  <CollectionCard
                    key={item.collection.id}
                    collection={item.collection}
                    onClick={() => set({ openCollectionId: item.collection.id, openWorkId: null })}
                  />
                )
              )}
            </div>
          </div>
        ))}
      </div>
      )}
    </div>
  );
}
