import { Badge } from "@/components/ui/badge";
import { ERAS, ERA_COLORS, type EraIndex } from "@/constants/eras";
import { MEDIUMS, MEDIUM_COLORS } from "@/constants/mediums";
import { formatYear } from "@/lib/formatYear";
import { formatSeriesAndNumber } from "@/lib/formatSeriesAndNumber";
import type { Work } from "@/types/work";

export function WorkCard({ work, onClick }: { work: Work; onClick: () => void }) {
  const mediumLabel = MEDIUMS[work.medium] ?? "?";
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex flex-col overflow-hidden rounded-lg border bg-card text-left shadow-sm transition hover:shadow-md focus:outline-none focus:ring-2 focus:ring-ring"
    >
      <div className="aspect-[2/3] w-full overflow-hidden bg-muted">
        {work.cover_url ? (
          <img
            src={work.cover_url}
            alt=""
            loading="lazy"
            className="h-full w-full object-contain bg-muted/40 transition group-hover:scale-[1.02]"
          />
        ) : (
          <div
            className="flex h-full items-center justify-center text-3xl text-white/70"
            style={{ backgroundColor: ERA_COLORS[work.era as EraIndex] }}
          >
            {mediumLabel[0]}
          </div>
        )}
      </div>
      <div className="space-y-1 p-3">
        <p className="line-clamp-2 font-medium leading-tight">{work.title}</p>
        {work.series && (
          <p className="line-clamp-1 text-xs text-muted-foreground">
            {formatSeriesAndNumber(work)}
          </p>
        )}
        <div className="flex flex-wrap items-center gap-1 pt-1">
          <Badge style={{ backgroundColor: MEDIUM_COLORS[work.medium], color: "white" }}>{mediumLabel}</Badge>
          <Badge style={{ backgroundColor: ERA_COLORS[work.era as EraIndex], color: "white" }}>
            {ERAS[work.era]}
          </Badge>
          <span className="text-xs text-muted-foreground">{formatYear(work.year)}</span>
        </div>
        {work.authors && work.authors.length > 0 && (
          <p className="line-clamp-1 text-xs text-muted-foreground">{work.authors.join(", ")}</p>
        )}
      </div>
    </button>
  );
}
