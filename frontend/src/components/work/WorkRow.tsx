import { Badge } from "@/components/ui/badge";
import { ERAS, ERA_COLORS, type EraIndex } from "@/constants/eras";
import { MEDIUMS, MEDIUM_COLORS } from "@/constants/mediums";
import { formatYear } from "@/lib/formatYear";
import type { Work } from "@/types/work";

interface WorkRowProps {
  work: Work;
  onClick: () => void;
}

export function WorkRow({ work, onClick }: WorkRowProps) {
  return (
    <tr
      onClick={onClick}
      className="cursor-pointer border-b text-sm hover:bg-muted/40"
    >
      {/* Cover thumbnail */}
      <td className="w-12 px-2 py-1">
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
      </td>

      {/* Title */}
      <td className="px-2 py-1 font-medium">{work.title}</td>

      {/* Series */}
      <td className="px-2 py-1 text-muted-foreground">{work.series ?? ""}</td>

      {/* Number */}
      <td className="px-2 py-1 text-muted-foreground">{work.number ?? ""}</td>

      {/* Medium */}
      <td className="px-2 py-1">
        <Badge style={{ backgroundColor: MEDIUM_COLORS[work.medium], color: "white" }}>
          {MEDIUMS[work.medium]}
        </Badge>
      </td>

      {/* Era */}
      <td className="px-2 py-1">
        <Badge style={{ backgroundColor: ERA_COLORS[work.era as EraIndex], color: "white" }}>
          {ERAS[work.era]}
        </Badge>
      </td>

      {/* Year */}
      <td className="px-2 py-1 text-muted-foreground whitespace-nowrap">{formatYear(work.year)}</td>

      {/* Release date */}
      <td className="px-2 py-1 text-muted-foreground whitespace-nowrap">{work.release_date ?? ""}</td>

      {/* Authors */}
      <td className="px-2 py-1 text-muted-foreground">{work.authors?.join(", ") ?? ""}</td>

      {/* Publisher */}
      <td className="px-2 py-1 text-muted-foreground">{work.publisher ?? ""}</td>
    </tr>
  );
}
