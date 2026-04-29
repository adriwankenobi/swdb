import { ScrollArea } from "@/components/ui/scroll-area";
import { SeriesFilter } from "@/components/filters/SeriesFilter";
import { AuthorFilter } from "@/components/filters/AuthorFilter";
import { PublisherFilter } from "@/components/filters/PublisherFilter";
import { YearRangeFilter } from "@/components/filters/YearRangeFilter";
import { ReleaseRangeFilter } from "@/components/filters/ReleaseRangeFilter";

export function Sidebar() {
  return (
    <aside className="hidden w-72 shrink-0 border-r md:block">
      <ScrollArea className="h-full p-4">
        <div className="space-y-6 text-sm">
          <SeriesFilter />
          <AuthorFilter />
          <PublisherFilter />
          <YearRangeFilter />
          <ReleaseRangeFilter />
        </div>
      </ScrollArea>
    </aside>
  );
}
