import { Badge } from "@/components/ui/badge";
import { ERAS, ERA_COLORS, type EraIndex } from "@/constants/eras";
import { MEDIUMS, MEDIUM_COLORS } from "@/constants/mediums";
import { formatYear } from "@/lib/formatYear";
import type { Work } from "@/types/work";
import { COLUMNS } from "@/components/views/_tableColumns";

interface WorkRowProps {
  work: Work;
  onClick: () => void;
}

export function WorkRow({ work, onClick }: WorkRowProps) {
  return (
    <div
      onClick={onClick}
      className="flex cursor-pointer items-center border-b text-sm hover:bg-muted/40"
    >
      {/* Cover */}
      <div className={`shrink-0 px-2 py-1 ${COLUMNS[0].width}`}>
        {work.cover_url ? (
          <img
            src={work.cover_url}
            alt=""
            loading="lazy"
            className="h-12 w-8 rounded object-cover"
          />
        ) : (
          <div
            className="h-12 w-8 rounded"
            style={{ backgroundColor: ERA_COLORS[work.era as EraIndex] }}
          />
        )}
      </div>

      {/* Title */}
      <div className={`shrink-0 px-2 py-1 font-medium truncate ${COLUMNS[1].width}`}>
        {work.title}
      </div>

      {/* Series */}
      <div className={`shrink-0 px-2 py-1 text-muted-foreground truncate ${COLUMNS[2].width}`}>
        {work.series ?? ""}
      </div>

      {/* Number */}
      <div className={`shrink-0 px-2 py-1 text-muted-foreground ${COLUMNS[3].width}`}>
        {work.number ?? ""}
      </div>

      {/* Medium badge */}
      <div className={`shrink-0 px-2 py-1 ${COLUMNS[4].width}`}>
        <Badge style={{ backgroundColor: MEDIUM_COLORS[work.medium], color: "white" }}>
          {MEDIUMS[work.medium] ?? "?"}
        </Badge>
      </div>

      {/* Era badge */}
      <div className={`shrink-0 px-2 py-1 ${COLUMNS[5].width}`}>
        <Badge style={{ backgroundColor: ERA_COLORS[work.era as EraIndex], color: "white" }}>
          {ERAS[work.era]}
        </Badge>
      </div>

      {/* Year */}
      <div className={`shrink-0 px-2 py-1 text-muted-foreground whitespace-nowrap ${COLUMNS[6].width}`}>
        {formatYear(work.year, work.year_end)}
      </div>

      {/* Release */}
      <div className={`shrink-0 px-2 py-1 text-muted-foreground whitespace-nowrap ${COLUMNS[7].width}`}>
        {work.release_date ?? ""}
      </div>

      {/* Authors */}
      <div className={`shrink-0 px-2 py-1 text-muted-foreground truncate ${COLUMNS[8].width}`}>
        {work.authors?.join(", ") ?? ""}
      </div>

      {/* Publisher */}
      <div className={`shrink-0 px-2 py-1 text-muted-foreground truncate ${COLUMNS[9].width}`}>
        {work.publisher ?? ""}
      </div>
    </div>
  );
}
