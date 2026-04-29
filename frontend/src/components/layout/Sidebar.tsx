import { ScrollArea } from "@/components/ui/scroll-area";
import { SeriesFilter } from "@/components/filters/SeriesFilter";
import { AuthorFilter } from "@/components/filters/AuthorFilter";
import { PublisherFilter } from "@/components/filters/PublisherFilter";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

function Filters() {
  return (
    <div className="space-y-6 text-sm">
      <SeriesFilter />
      <AuthorFilter />
      <PublisherFilter />
    </div>
  );
}

export function Sidebar() {
  return (
    <aside className="hidden w-72 shrink-0 border-r md:block">
      <ScrollArea className="h-full p-4">
        <Filters />
      </ScrollArea>
    </aside>
  );
}

interface MobileSidebarProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export function MobileSidebar({ open, onOpenChange }: MobileSidebarProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-72 overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Filters</SheetTitle>
        </SheetHeader>
        <div className="p-4">
          <Filters />
        </div>
      </SheetContent>
    </Sheet>
  );
}
