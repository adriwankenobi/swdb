import { Badge } from "@/components/ui/badge";
import { ERA_COLORS } from "@/constants/eras";
import { MEDIUM_COLORS } from "@/constants/mediums";
import { formatYear } from "@/lib/formatYear";
import { formatReleaseDateCompact } from "@/lib/formatReleaseDate";
import type { DerivedCollection } from "@/types/work";
import { COLUMNS } from "@/components/views/_tableColumns";

interface CollectionRowProps {
  collection: DerivedCollection;
  onClick: () => void;
}

export function CollectionRow({ collection, onClick }: CollectionRowProps) {
  const c = collection;
  // A collection can span multiple eras/mediums; the table shows one badge
  // plus a "+N" overflow count (full list is in the detail modal).
  const primaryMedium = c.mediums[0];
  const primaryEra = (c.anchor_era || c.eras[0]) as keyof typeof ERA_COLORS;
  return (
    <div
      onClick={onClick}
      className="flex cursor-pointer items-center border-b text-sm transition-shadow hover:shadow-[inset_0_0_0_9999px_rgba(0,0,0,0.05)]"
      style={{ backgroundColor: "var(--owned-bg)" }}
    >
      {/* Cover */}
      <div
        className={`sticky left-0 z-10 shrink-0 px-2 py-1 ${COLUMNS[0].width}`}
        style={{ backgroundColor: "var(--owned-bg)" }}
      >
        {c.cover_url ? (
          <img
            src={c.cover_url}
            alt=""
            loading="lazy"
            className="h-12 w-8 rounded object-cover"
          />
        ) : (
          <div
            className="h-12 w-8 rounded"
            style={{ backgroundColor: c.anchor_era ? ERA_COLORS[c.anchor_era] : "var(--muted)" }}
          />
        )}
      </div>

      {/* Title */}
      <div className={`shrink-0 px-2 py-1 font-medium truncate ${COLUMNS[1].width}`}>
        {c.title}
      </div>

      {/* Series — union of member series */}
      <div className={`shrink-0 px-2 py-1 text-muted-foreground truncate ${COLUMNS[2].width}`}>
        {c.series.join(", ")}
      </div>

      {/* Number — the collection's own "#" */}
      <div className={`shrink-0 px-2 py-1 text-muted-foreground ${COLUMNS[3].width}`}>
        {c.number ?? ""}
      </div>

      {/* Medium — first badge + overflow count */}
      <div className={`shrink-0 px-2 py-1 flex items-center gap-1 overflow-hidden ${COLUMNS[4].width}`}>
        {primaryMedium && (
          <Badge style={{ backgroundColor: MEDIUM_COLORS[primaryMedium], color: "white" }}>
            {primaryMedium}
          </Badge>
        )}
        {c.mediums.length > 1 && (
          <span className="shrink-0 text-xs text-muted-foreground">+{c.mediums.length - 1}</span>
        )}
      </div>

      {/* Era — first badge + overflow count */}
      <div className={`shrink-0 px-2 py-1 flex items-center gap-1 overflow-hidden ${COLUMNS[5].width}`}>
        {c.eras.length > 0 && (
          <Badge style={{ backgroundColor: ERA_COLORS[primaryEra], color: "white" }}>
            {primaryEra}
          </Badge>
        )}
        {c.eras.length > 1 && (
          <span className="shrink-0 text-xs text-muted-foreground">+{c.eras.length - 1}</span>
        )}
      </div>

      {/* Year */}
      <div className={`shrink-0 px-2 py-1 text-muted-foreground whitespace-nowrap ${COLUMNS[6].width}`}>
        {formatYear(c.year, c.year_end)}
      </div>

      {/* Release */}
      <div className={`shrink-0 px-2 py-1 text-muted-foreground whitespace-nowrap ${COLUMNS[7].width}`}>
        {c.release_date ? formatReleaseDateCompact(c.release_date, c.release_precision) : ""}
      </div>

      {/* Authors — union of member authors */}
      <div className={`shrink-0 px-2 py-1 text-muted-foreground truncate ${COLUMNS[8].width}`}>
        {c.authors.join(", ")}
      </div>

      {/* Publisher — union of member publishers */}
      <div className={`shrink-0 px-2 py-1 text-muted-foreground truncate ${COLUMNS[9].width}`}>
        {c.publishers.join(", ")}
      </div>
    </div>
  );
}
