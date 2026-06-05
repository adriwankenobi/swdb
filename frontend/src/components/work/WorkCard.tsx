import { Badge } from "@/components/ui/badge";
import { ERA_COLORS } from "@/constants/eras";
import { MEDIUM_COLORS } from "@/constants/mediums";
import { formatYear } from "@/lib/formatYear";
import { formatSeriesAndNumber } from "@/lib/formatSeriesAndNumber";
import { resolveWorkCover } from "@/lib/resolveWorkCover";
import { useWorkCoverFallback } from "@/lib/useWorkCoverFallback";
import { useUserStore } from "../../store/userStore";
import { ownedBackground } from "../../lib/ownedBackground";
import { OwnedCheckbox } from "@/components/work/OwnedCheckbox";
import type { Work } from "@/types/work";

export function WorkCard({ work, onClick }: { work: Work; onClick: () => void }) {
  const coverByWorkId = useWorkCoverFallback();
  const cover = resolveWorkCover(work, coverByWorkId);
  const isOwned = useUserStore((s) => s.ownedIds.has(work.id));

  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex flex-col overflow-hidden rounded-lg border text-left shadow-sm transition hover:shadow-md focus:outline-none focus:ring-2 focus:ring-ring"
      style={{ backgroundColor: ownedBackground(isOwned) }}
    >
      <div className="aspect-[2/3] w-full overflow-hidden bg-muted">
        {cover.src ? (
          <img
            src={cover.src}
            alt=""
            loading="lazy"
            className={`h-full w-full object-contain bg-muted/40 transition group-hover:scale-[1.02] ${cover.borrowed ? "opacity-70 saturate-50" : ""}`}
          />
        ) : (
          <div
            className="flex h-full items-center justify-center px-3 text-center text-sm font-semibold leading-snug text-white text-balance line-clamp-6 break-words"
            style={{ backgroundColor: ERA_COLORS[work.era] }}
          >
            {work.title}
          </div>
        )}
      </div>
      <div className="space-y-1 p-3">
        <p className="line-clamp-2 font-medium leading-tight">{work.title}</p>
        {((work.series?.length ?? 0) > 0 || (work.number?.length ?? 0) > 0) && (
          <p className="line-clamp-1 text-xs text-muted-foreground">
            {formatSeriesAndNumber(work)}
          </p>
        )}
        <div className="flex flex-wrap items-center gap-1 pt-1">
          <Badge style={{ backgroundColor: MEDIUM_COLORS[work.medium], color: "white" }}>{work.medium}</Badge>
          <Badge
            className="h-auto max-w-full whitespace-normal px-1 text-center text-[10px] leading-tight sm:h-5 sm:max-w-none sm:whitespace-nowrap sm:px-2 sm:text-xs sm:leading-normal"
            style={{ backgroundColor: ERA_COLORS[work.era], color: "white" }}
          >
            {work.era}
          </Badge>
          <span className="text-xs text-muted-foreground">{formatYear(work.year, work.year_end)}</span>
        </div>
        {work.authors && work.authors.length > 0 && (
          <p className="line-clamp-1 text-xs text-muted-foreground">{work.authors.join(", ")}</p>
        )}
        <OwnedCheckbox workId={work.id} />
      </div>
    </button>
  );
}
