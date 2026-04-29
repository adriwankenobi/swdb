import { ERAS, ERA_COLORS, type EraIndex } from "@/constants/eras";
import { MEDIUM_COLORS } from "@/constants/mediums";
import { formatYear } from "@/lib/formatYear";
import { groupForChronology, groupForRelease } from "@/lib/timelineGroups";
import { useFilterStore } from "@/store/filterStore";
import type { Work } from "@/types/work";

interface MarkerProps {
  work: Work;
  onClick: () => void;
}

function Marker({ work, onClick }: MarkerProps) {
  const yearLabel = formatYear(work.year, work.year_end);
  const tooltip = `${work.title}${work.series ? ` — ${work.series}` : ""} (${yearLabel})`;
  const mediumColor = MEDIUM_COLORS[work.medium];
  const eraColor = ERA_COLORS[work.era as EraIndex];

  return (
    <button
      type="button"
      onClick={onClick}
      title={tooltip}
      className="size-16 shrink-0 overflow-hidden rounded"
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

export function TimelineView({ works }: { works: Work[] }) {
  const sort = useFilterStore((s) => s.sort);
  const set = useFilterStore((s) => s.set);

  if (works.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        No works match these filters.
      </div>
    );
  }

  function openWork(id: string) {
    set({ openWorkId: id });
  }

  if (sort === "chronology") {
    const groups = groupForChronology(works);
    return (
      <div className="h-full overflow-auto">
        <div className="space-y-8 p-4">
          {groups.map((group) => {
            const eraColor = ERA_COLORS[group.eraIndex as EraIndex];
            const eraName = ERAS[group.eraIndex as EraIndex];
            return (
              <div key={group.eraIndex}>
                {/* Era header */}
                <div className="mb-3 flex items-center gap-2">
                  <span
                    className="rounded px-2 py-0.5 text-xs font-semibold uppercase tracking-wider text-white"
                    style={{ backgroundColor: eraColor }}
                  >
                    {eraName}
                  </span>
                </div>
                {/* Year rows (in Excel order; consecutive same-span works coalesce) */}
                <div className="space-y-2 pl-2">
                  {group.rows.map((row, idx) => (
                    <div key={`${row.year}-${row.year_end ?? ""}-${idx}`} className="flex items-start gap-3">
                      <span className="w-40 shrink-0 pt-1 text-right text-xs text-muted-foreground tabular-nums whitespace-nowrap">
                        {formatYear(row.year, row.year_end)}
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {row.works.map((work) => (
                          <Marker
                            key={work.id}
                            work={work}
                            onClick={() => openWork(work.id)}
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
  const groups = groupForRelease(works);
  return (
    <div className="h-full overflow-auto">
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
              {/* Works row */}
              <div className="flex flex-wrap gap-2 pl-2">
                {group.works.map((work) => (
                  <Marker
                    key={work.id}
                    work={work}
                    onClick={() => openWork(work.id)}
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
