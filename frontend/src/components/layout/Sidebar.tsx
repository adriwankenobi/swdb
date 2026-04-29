import { ScrollArea } from "@/components/ui/scroll-area";

export function Sidebar() {
  return (
    <aside className="hidden w-72 shrink-0 border-r md:block">
      <ScrollArea className="h-full p-4">
        <div className="space-y-4 text-sm">
          <p className="font-medium">Filters</p>
          <p className="text-muted-foreground">(filters wired up in next task)</p>
        </div>
      </ScrollArea>
    </aside>
  );
}
