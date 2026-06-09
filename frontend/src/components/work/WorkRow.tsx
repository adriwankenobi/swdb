import { Badge } from "@/components/ui/badge";
import { ERA_COLORS } from "@/constants/eras";
import { MEDIUM_COLORS } from "@/constants/mediums";
import { formatYear } from "@/lib/formatYear";
import { formatReleaseDateCompact } from "@/lib/formatReleaseDate";
import type { Work } from "@/types/work";
import { COLUMNS, OWNED_COLUMN_WIDTH, COLLECTION_TYPE_COLUMN_WIDTH } from "@/components/views/_tableColumns";
import { useFilterStore } from "@/store/filterStore";
import { resolveWorkCover } from "@/lib/resolveWorkCover";
import { useWorkCoverFallback } from "@/lib/useWorkCoverFallback";
import { useUserStore } from "../../store/userStore";
import { ownedBackground } from "../../lib/ownedBackground";
import { OwnedCheckbox } from "@/components/work/OwnedCheckbox";

interface WorkRowProps {
  work: Work;
  onClick: () => void;
}

export function WorkRow({ work, onClick }: WorkRowProps) {
  const coverByWorkId = useWorkCoverFallback();
  const cover = resolveWorkCover(work, coverByWorkId);
  const isOwned = useUserStore((s) => s.ownedIds.has(work.id));
  const session = useUserStore((s) => s.session);
  const itemsMode = useFilterStore((s) => s.items);
  // Owned cell only in issues mode (matches the TableView header gate).
  const showOwnedCell = session !== null && itemsMode !== "collections";
  // In collections mode the trailing Type column is shown; standalone works
  // render an empty cell there to stay aligned with collection rows.
  const showTypeCell = itemsMode === "collections";

  return (
    <div
      onClick={onClick}
      className="flex cursor-pointer items-center border-b text-sm transition-shadow hover:shadow-[inset_0_0_0_9999px_rgba(0,0,0,0.05)]"
      style={{ backgroundColor: ownedBackground(isOwned, "transparent") }}
    >
      {/* Cover */}
      <div
        className={`sticky left-0 z-10 shrink-0 px-2 py-1 ${COLUMNS[0].width}`}
        style={{ backgroundColor: ownedBackground(isOwned, "var(--background)") }}
      >
        {cover.src ? (
          <img
            src={cover.src}
            alt=""
            loading="lazy"
            className={`h-12 w-8 rounded object-cover ${cover.borrowed ? "opacity-70 saturate-50" : ""}`}
          />
        ) : (
          <div
            className="h-12 w-8 rounded"
            style={{ backgroundColor: ERA_COLORS[work.era] }}
          />
        )}
      </div>

      {/* Title */}
      <div className={`shrink-0 px-2 py-1 font-medium truncate ${COLUMNS[1].width}`}>
        {work.title}
      </div>

      {/* Series */}
      <div className={`shrink-0 px-2 py-1 text-muted-foreground truncate ${COLUMNS[2].width}`}>
        {work.series?.join(", ") ?? ""}
      </div>

      {/* Number */}
      <div className={`shrink-0 px-2 py-1 text-muted-foreground ${COLUMNS[3].width}`}>
        {work.number?.join(", ") ?? ""}
      </div>

      {/* Medium badge */}
      <div className={`shrink-0 px-2 py-1 ${COLUMNS[4].width}`}>
        <Badge style={{ backgroundColor: MEDIUM_COLORS[work.medium], color: "white" }}>
          {work.medium}
        </Badge>
      </div>

      {/* Type — empty for works; cell present only in collections mode */}
      {showTypeCell && <div className={`shrink-0 px-2 py-1 ${COLLECTION_TYPE_COLUMN_WIDTH}`} />}

      {/* Era badge */}
      <div className={`shrink-0 px-2 py-1 ${COLUMNS[5].width}`}>
        <Badge style={{ backgroundColor: ERA_COLORS[work.era], color: "white" }}>
          {work.era}
        </Badge>
      </div>

      {/* Year */}
      <div className={`shrink-0 px-2 py-1 text-muted-foreground whitespace-nowrap ${COLUMNS[6].width}`}>
        {formatYear(work.year, work.year_end)}
      </div>

      {/* Release */}
      <div className={`shrink-0 px-2 py-1 text-muted-foreground whitespace-nowrap ${COLUMNS[7].width}`}>
        {work.release_date ? formatReleaseDateCompact(work.release_date, work.release_precision) : ""}
      </div>

      {/* Authors */}
      <div className={`shrink-0 px-2 py-1 text-muted-foreground truncate ${COLUMNS[8].width}`}>
        {work.authors?.join(", ") ?? ""}
      </div>

      {/* Publisher — hidden in collections mode (matches the TableView header) */}
      {!showTypeCell && (
        <div className={`shrink-0 px-2 py-1 text-muted-foreground truncate ${COLUMNS[9].width}`}>
          {work.publisher ?? ""}
        </div>
      )}

      {/* Owned toggle — cell only present in issues mode, matching the header */}
      {showOwnedCell && (
        <div className={`shrink-0 px-2 py-1 ${OWNED_COLUMN_WIDTH}`}>
          <OwnedCheckbox workId={work.id} showLabel={false} />
        </div>
      )}
    </div>
  );
}
