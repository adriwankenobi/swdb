import { useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { WorkRow } from "@/components/work/WorkRow";
import { useFilterStore } from "@/store/filterStore";
import type { Work } from "@/types/work";

// Column definitions: label + fixed width (used for both header and virtual rows)
const COLUMNS = [
  { label: "Cover",     width: "3.5rem"  },
  { label: "Title",     width: "16rem"   },
  { label: "Series",    width: "12rem"   },
  { label: "#",         width: "3rem"    },
  { label: "Medium",    width: "8rem"    },
  { label: "Era",       width: "11rem"   },
  { label: "Year",      width: "6rem"    },
  { label: "Release",   width: "6.5rem"  },
  { label: "Authors",   width: "14rem"   },
  { label: "Publisher", width: "9rem"    },
] as const;

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

  const totalHeight = virtualizer.getTotalSize();

  return (
    <div ref={parentRef} className="h-full overflow-auto">
      {/* Sticky header — rendered as a real table so column widths stay consistent */}
      <table
        className="w-full border-collapse"
        style={{ tableLayout: "fixed", minWidth: "max-content" }}
      >
        <colgroup>
          {COLUMNS.map((col) => (
            <col key={col.label} style={{ width: col.width }} />
          ))}
        </colgroup>
        <thead className="sticky top-0 z-10 bg-background">
          <tr>
            {COLUMNS.map((col) => (
              <th
                key={col.label}
                className="px-2 py-2 text-left text-xs uppercase text-muted-foreground"
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
      </table>

      {/* Virtualizer container — absolutely-positions rows */}
      <div style={{ height: totalHeight, position: "relative" }}>
        {virtualizer.getVirtualItems().map((vr) => {
          const work = works[vr.index];
          return (
            // Each virtual row wraps its <tr> in a <table> so it renders correctly
            <table
              key={vr.key}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                tableLayout: "fixed",
                minWidth: "max-content",
                transform: `translateY(${vr.start}px)`,
                borderCollapse: "collapse",
              }}
            >
              <colgroup>
                {COLUMNS.map((col) => (
                  <col key={col.label} style={{ width: col.width }} />
                ))}
              </colgroup>
              <tbody>
                <WorkRow
                  work={work}
                  onClick={() => set({ openWorkId: work.id })}
                />
              </tbody>
            </table>
          );
        })}
      </div>
    </div>
  );
}
