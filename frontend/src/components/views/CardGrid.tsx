import { useRef, useMemo, useEffect, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { WorkCard } from "@/components/work/WorkCard";
import { useFilterStore } from "@/store/filterStore";
import { useScrollResetOnFilterChange } from "@/lib/useScrollResetOnFilterChange";
import { computeColumnCount } from "@/lib/computeColumnCount";
import type { Work } from "@/types/work";

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

export function CardGrid({ works }: { works: Work[] }) {
  const parentRef = useRef<HTMLDivElement>(null);
  const cols = useResponsiveColumns(parentRef);
  const set = useFilterStore((s) => s.set);
  useScrollResetOnFilterChange(parentRef);

  const rows = useMemo(() => {
    const arr: Work[][] = [];
    for (let i = 0; i < works.length; i += cols) {
      arr.push(works.slice(i, i + cols));
    }
    return arr;
  }, [works, cols]);

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 4,
  });

  if (works.length === 0) {
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
              {rows[vr.index].map((w) => (
                <WorkCard key={w.id} work={w} onClick={() => set({ openWorkId: w.id })} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
