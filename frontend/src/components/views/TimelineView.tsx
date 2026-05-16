import { useRef } from "react";
import { ERA_COLORS } from "@/constants/eras";
import { MEDIUM_COLORS } from "@/constants/mediums";
import { formatYear } from "@/lib/formatYear";
import { groupForChronology, groupForRelease } from "@/lib/timelineGroups";
import { useScrollResetOnFilterChange } from "@/lib/useScrollResetOnFilterChange";
import { useFilterStore } from "@/store/filterStore";
import type { Item } from "@/lib/buildItemsList";
import type { Work } from "@/types/work";

// ---------------------------------------------------------------------------
// Marker — a single clickable thumbnail in the timeline.
// ---------------------------------------------------------------------------

interface WorkMarkerProps {
  work: Work;
  onClick: () => void;
}

function WorkMarker({ work, onClick }: WorkMarkerProps) {
  const yearLabel = formatYear(work.year, work.year_end);
  const seriesStr = (work.series ?? []).join(", ");
  const tooltip = `${work.title}${seriesStr ? ` — ${seriesStr}` : ""} (${yearLabel})`;
  const mediumColor = MEDIUM_COLORS[work.medium];
  const eraColor = ERA_COLORS[work.era];

  return (
    <button
      type="button"
      onClick={onClick}
      title={tooltip}
      className="size-11 shrink-0 overflow-hidden rounded md:size-16"
      style={{ boxShadow: `0 0 0 2px ${mediumColor}` }}
    >
      {work.cover_url ? (
        <img
          src={work.cover_url}
          alt=""
          className="h-full w-full object-cover"
        />
      ) : (
        <div
          className="flex h-full w-full items-center justify-center px-1 text-center text-[10px] font-semibold leading-tight text-white line-clamp-3 break-words"
          style={{ backgroundColor: eraColor }}
        >
          {work.title}
        </div>
      )}
    </button>
  );
}

// Placeholder marker for collection items — Phase 6 replaces this with CollectionCard.
interface CollectionMarkerProps {
  title: string;
  coverUrl?: string;
  eraColor: string;
  onClick: () => void;
}

function CollectionMarker({ title, coverUrl, eraColor, onClick }: CollectionMarkerProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className="size-11 shrink-0 overflow-hidden rounded md:size-16"
      style={{ boxShadow: `0 0 0 2px ${eraColor}`, outline: `2px dashed ${eraColor}`, outlineOffset: "2px" }}
    >
      {coverUrl ? (
        <img
          src={coverUrl}
          alt=""
          className="h-full w-full object-cover"
        />
      ) : (
        <div
          className="flex h-full w-full items-center justify-center px-1 text-center text-[10px] font-semibold leading-tight text-white line-clamp-3 break-words"
          style={{ backgroundColor: eraColor }}
        >
          {title}
        </div>
      )}
    </button>
  );
}

// Dispatch to the right marker variant based on item kind.
function ItemMarker({ item, set }: { item: Item; set: (s: object) => void }) {
  if (item.kind === "work") {
    return (
      <WorkMarker
        work={item.work}
        onClick={() => set({ openWorkId: item.work.id })}
      />
    );
  }
  const { collection } = item;
  return (
    <CollectionMarker
      title={collection.title}
      coverUrl={collection.cover_url}
      eraColor={ERA_COLORS[collection.anchor_era]}
      onClick={() => set({ openCollectionId: collection.id })}
    />
  );
}

// ---------------------------------------------------------------------------
// TimelineView
// ---------------------------------------------------------------------------

export function TimelineView({ items }: { items: Item[] }) {
  const sort = useFilterStore((s) => s.sort);
  const set = useFilterStore((s) => s.set);
  const scrollRef = useRef<HTMLDivElement>(null);
  useScrollResetOnFilterChange(scrollRef);

  if (items.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        No works match these filters.
      </div>
    );
  }

  if (sort === "chronology") {
    const groups = groupForChronology(items);
    return (
      <div ref={scrollRef} className="h-full overflow-auto">
        <div className="space-y-8 p-4">
          {groups.map((group) => {
            const eraColor = ERA_COLORS[group.era];
            return (
              <div key={group.era}>
                {/* Era header */}
                <div className="mb-3 flex items-center gap-2">
                  <span
                    className="rounded px-2 py-0.5 text-xs font-semibold uppercase tracking-wider text-white"
                    style={{ backgroundColor: eraColor }}
                  >
                    {group.era}
                  </span>
                </div>
                {/* Year rows (in Excel order; consecutive same-span items coalesce) */}
                <div className="space-y-2 pl-2">
                  {group.rows.map((row, idx) => (
                    <div
                      key={`${row.year}-${row.year_end ?? ""}-${idx}`}
                      className="flex flex-col items-start gap-1 md:flex-row md:items-start md:gap-3"
                    >
                      <span className="text-xs text-muted-foreground tabular-nums whitespace-nowrap md:w-40 md:shrink-0 md:pt-1 md:text-right">
                        {formatYear(row.year, row.year_end)}
                      </span>
                      <div className="flex flex-wrap gap-1 md:gap-2">
                        {row.items.map((item) => (
                          <ItemMarker
                            key={item.kind === "work" ? item.work.id : item.collection.id}
                            item={item}
                            set={set}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Release mode
  const groups = groupForRelease(items);
  return (
    <div ref={scrollRef} className="h-full overflow-auto">
      <div className="space-y-6 p-4">
        {groups.map((group) => {
          const headerLabel = group.year !== null ? String(group.year) : "Unknown";
          const key = group.year !== null ? group.year : "unknown";
          return (
            <div key={key}>
              {/* Year header */}
              <div className="mb-3">
                <span className="text-sm font-semibold text-foreground">
                  {headerLabel}
                </span>
              </div>
              {/* Items row */}
              <div className="flex flex-wrap gap-1 pl-2 md:gap-2">
                {group.items.map((item) => (
                  <ItemMarker
                    key={item.kind === "work" ? item.work.id : item.collection.id}
                    item={item}
                    set={set}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
