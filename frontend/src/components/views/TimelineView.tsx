import { ERAS, ERA_COLORS, type EraIndex } from "@/constants/eras";
import { MEDIUMS, MEDIUM_COLORS } from "@/constants/mediums";
import { formatYear } from "@/lib/formatYear";
import { groupForChronology, groupForRelease } from "@/lib/timelineGroups";
import { useFilterStore } from "@/store/filterStore";
import type { Work } from "@/types/work";

interface MarkerProps {
  work: Work;
  onClick: () => void;
}

function Marker({ work, onClick }: MarkerProps) {
  const tooltip = `${work.title}${work.series ? ` — ${work.series}` : ""}`;
  const mediumColor = MEDIUM_COLORS[work.medium];
  const eraColor = ERA_COLORS[work.era as EraIndex];
  const mediumLetter = MEDIUMS[work.medium][0];

  return (
    <button
      type="button"
      onClick={onClick}
      title={tooltip}
      className="size-12 shrink-0 overflow-hidden rounded"
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
          className="flex h-full w-full items-center justify-center text-sm font-bold text-white"
          style={{ backgroundColor: eraColor }}
        >
          {mediumLetter}
        </div>
      )}
    </button>
  );
}

export function TimelineView({ works }: { works: Work[] }) {
  const { sort, set } = useFilterStore((s) => ({ sort: s.sort, set: s.set }));

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
                {/* Year rows */}
                <div className="space-y-2 pl-2">
                  {group.years.map(({ year, works: yearWorks }) => (
                    <div key={year} className="flex items-start gap-3">
                      <span className="w-24 shrink-0 pt-1 text-right text-xs text-muted-foreground tabular-nums">
                        {formatYear(year)}
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {yearWorks.map((work) => (
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
          const headerLabel = group.year !== null ? String(group.year) : "Undated";
          const key = group.year !== null ? group.year : "undated";
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
