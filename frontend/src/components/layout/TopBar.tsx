import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useFilterStore } from "@/store/filterStore";

interface TopBarProps {
  onHome?: () => void;
}

export function TopBar({ onHome }: TopBarProps) {
  const { q, set, view, sort } = useFilterStore();
  return (
    <header className="flex items-center gap-3 border-b px-4 py-2">
      <button
        type="button"
        onClick={onHome}
        className="text-lg font-semibold tracking-tight hover:opacity-70 transition-opacity"
      >
        SWDB
      </button>
      <Input
        placeholder="Search title, series, author…"
        value={q}
        onChange={(e) => set({ q: e.target.value })}
        className="max-w-md"
      />
      <div className="ml-auto flex items-center gap-2">
        <div className="flex rounded-md border bg-background">
          {(["cards", "table", "timeline"] as const).map((v) => (
            <Button
              key={v}
              variant={view === v ? "default" : "ghost"}
              size="sm"
              onClick={() => set({ view: v })}
              className="rounded-none first:rounded-l-md last:rounded-r-md"
            >
              {v}
            </Button>
          ))}
        </div>
        <div className="flex rounded-md border bg-background">
          {(["chronology", "release"] as const).map((s) => (
            <Button
              key={s}
              variant={sort === s ? "default" : "ghost"}
              size="sm"
              onClick={() => set({ sort: s })}
              className="rounded-none first:rounded-l-md last:rounded-r-md"
            >
              {s}
            </Button>
          ))}
        </div>
      </div>
    </header>
  );
}
