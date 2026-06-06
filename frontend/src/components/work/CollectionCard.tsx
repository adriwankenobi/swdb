import { Badge } from "@/components/ui/badge";
import { ERA_COLORS } from "@/constants/eras";
import { MEDIUM_COLORS } from "@/constants/mediums";
import { formatYear } from "@/lib/formatYear";
import { formatCollectionTitle } from "@/lib/formatSeriesAndNumber";
import type { DerivedCollection } from "@/types/work";

export function CollectionCard({ collection, onClick }: { collection: DerivedCollection; onClick: () => void }) {
  const c = collection;
  const title = formatCollectionTitle(c);
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex flex-col overflow-hidden rounded-lg border text-left shadow-sm transition hover:shadow-md focus:outline-none focus:ring-2 focus:ring-ring"
      style={{ backgroundColor: "var(--owned-bg)" }}
    >
      <div className="aspect-[2/3] w-full overflow-hidden bg-muted">
        {c.cover_url ? (
          <img
            src={c.cover_url}
            alt=""
            loading="lazy"
            className="h-full w-full object-contain bg-muted/40 transition group-hover:scale-[1.02]"
          />
        ) : (
          <div
            className="flex h-full items-center justify-center px-3 text-center text-sm font-semibold leading-snug text-white text-balance line-clamp-6 break-words"
            style={{ backgroundColor: c.anchor_era ? ERA_COLORS[c.anchor_era] : "var(--muted)" }}
          >
            {title}
          </div>
        )}
      </div>
      <div className="space-y-1 p-3">
        <p className="line-clamp-2 font-medium leading-tight">{title}</p>
        {c.series.length > 0 && (
          <p className="line-clamp-1 text-xs text-muted-foreground">{c.series.join(", ")}</p>
        )}
        {/* Mediums row */}
        <div className="flex flex-wrap items-center gap-1 pt-1">
          {c.mediums.map((m) => (
            <Badge key={m} style={{ backgroundColor: MEDIUM_COLORS[m], color: "white" }}>
              {m}
            </Badge>
          ))}
        </div>
        {/* Eras row */}
        <div className="flex flex-wrap items-center gap-1">
          {c.eras.map((e) => (
            <Badge
              key={e}
              className="h-auto max-w-full whitespace-normal px-1 text-center text-[10px] leading-tight sm:h-5 sm:max-w-none sm:whitespace-nowrap sm:px-2 sm:text-xs sm:leading-normal"
              style={{ backgroundColor: ERA_COLORS[e], color: "white" }}
            >
              {e}
            </Badge>
          ))}
          <span className="text-xs text-muted-foreground">{formatYear(c.year, c.year_end)}</span>
        </div>
        {c.authors.length > 0 && (
          <p className="line-clamp-1 text-xs text-muted-foreground">{c.authors.join(", ")}</p>
        )}
      </div>
    </button>
  );
}
