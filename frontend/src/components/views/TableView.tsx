import { useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { WorkRow } from "@/components/work/WorkRow";
import { useFilterStore } from "@/store/filterStore";
import type { Work } from "@/types/work";
import { COLUMNS } from "./_tableColumns";

const ROW_HEIGHT = 56; // px

interface TableViewProps {
  works: Work[];
}

export function TableView({ works }: TableViewProps) {
  const parentRef = useRef<HTMLDivElement>(null);
  const set = useFilterStore((s) => s.set);

  const virtualizer = useVirtualizer({
    count: works.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 8,
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
      <div className="min-w-fit">
        {/* Sticky header */}
        <div className="sticky top-0 z-10 flex border-b bg-background text-xs uppercase text-muted-foreground">
          {COLUMNS.map((col) => (
            <div key={col.key} className={`shrink-0 px-2 py-2 ${col.width}`}>
              {col.label}
            </div>
          ))}
        </div>

        {/* Virtualized rows */}
        <div style={{ height: virtualizer.getTotalSize(), position: "relative" }}>
          {virtualizer.getVirtualItems().map((vr) => {
            const work = works[vr.index];
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
                <WorkRow
                  work={work}
                  onClick={() => set({ openWorkId: work.id })}
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
