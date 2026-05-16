import { Badge } from "@/components/ui/badge";
import { ERA_COLORS } from "@/constants/eras";
import { MEDIUM_COLORS } from "@/constants/mediums";
import { formatYear } from "@/lib/formatYear";
import { formatReleaseDateCompact } from "@/lib/formatReleaseDate";
import type { Collection } from "@/types/work";
import { COLUMNS } from "@/components/views/_tableColumns";

interface CollectionRowProps {
  collection: Collection;
  onClick: () => void;
}

export function CollectionRow({ collection, onClick }: CollectionRowProps) {
  const c = collection;
  return (
    <div
      onClick={onClick}
      className="flex cursor-pointer items-center border-b text-sm transition-shadow hover:shadow-[inset_0_0_0_9999px_rgba(0,0,0,0.05)]"
      style={{ backgroundColor: c.color ?? undefined }}
    >
      {/* Cover */}
      <div
        className={`sticky left-0 z-10 shrink-0 px-2 py-1 ${COLUMNS[0].width}`}
        style={{ backgroundColor: c.color ?? "var(--background)" }}
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
            style={{ backgroundColor: ERA_COLORS[c.anchor_era] }}
          />
        )}
      </div>

      {/* Title */}
      <div className={`shrink-0 px-2 py-1 font-medium truncate ${COLUMNS[1].width}`}>
        {c.title}
      </div>

      {/* Series — blank for collections */}
      <div className={`shrink-0 px-2 py-1 text-muted-foreground truncate ${COLUMNS[2].width}`} />

      {/* Number — blank for collections */}
      <div className={`shrink-0 px-2 py-1 text-muted-foreground ${COLUMNS[3].width}`} />

      {/* Medium badges */}
      <div className={`shrink-0 px-2 py-1 flex flex-wrap gap-1 ${COLUMNS[4].width}`}>
        {c.mediums.map((m) => (
          <Badge key={m} style={{ backgroundColor: MEDIUM_COLORS[m], color: "white" }}>
            {m}
          </Badge>
        ))}
      </div>

      {/* Era badges */}
      <div className={`shrink-0 px-2 py-1 flex flex-wrap gap-1 ${COLUMNS[5].width}`}>
        {c.eras.map((e) => (
          <Badge key={e} style={{ backgroundColor: ERA_COLORS[e], color: "white" }}>
            {e}
          </Badge>
        ))}
      </div>

      {/* Year */}
      <div className={`shrink-0 px-2 py-1 text-muted-foreground whitespace-nowrap ${COLUMNS[6].width}`}>
        {formatYear(c.year, c.year_end)}
      </div>

      {/* Release */}
      <div className={`shrink-0 px-2 py-1 text-muted-foreground whitespace-nowrap ${COLUMNS[7].width}`}>
        {c.release_date ? formatReleaseDateCompact(c.release_date, c.release_precision) : ""}
      </div>

      {/* Authors — blank for collections */}
      <div className={`shrink-0 px-2 py-1 text-muted-foreground truncate ${COLUMNS[8].width}`} />

      {/* Publisher — blank for collections */}
      <div className={`shrink-0 px-2 py-1 text-muted-foreground truncate ${COLUMNS[9].width}`} />
    </div>
  );
}
