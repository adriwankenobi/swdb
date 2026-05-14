import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useFilterStore } from "@/store/filterStore";
import { MobileSidebar } from "./Sidebar";
import {
  MenuIcon,
  LayoutGrid,
  Rows3,
  ChartGantt,
  BookOpen,
  Calendar,
} from "lucide-react";

interface TopBarProps {
  onHome?: () => void;
}

const VIEW_OPTIONS = [
  { value: "cards", label: "cards", Icon: LayoutGrid },
  { value: "table", label: "table", Icon: Rows3 },
  { value: "timeline", label: "timeline", Icon: ChartGantt },
] as const;

const SORT_OPTIONS = [
  { value: "chronology", label: "chronology", Icon: BookOpen },
  { value: "release", label: "release", Icon: Calendar },
] as const;

export function TopBar({ onHome }: TopBarProps) {
  const { q, set, view, sort } = useFilterStore();
  const previousQ = useRef(q);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [isMdUp, setIsMdUp] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(min-width: 768px)").matches,
  );

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    setIsMdUp(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setIsMdUp(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const onSelectSort = (next: "chronology" | "release") => {
    if (next === "chronology") {
      set({ sort: next, decades: [], releaseUndated: false });
    } else {
      set({ sort: next, eras: [] });
    }
  };

  return (
    <>
      <header className="flex items-center gap-3 border-b px-4 py-2">
        <Button
          variant="ghost"
          size="icon-sm"
          className="md:hidden"
          onClick={() => setDrawerOpen(true)}
          aria-label="Open filters"
        >
          <MenuIcon />
        </Button>
        <button
          type="button"
          onClick={onHome}
          className="text-lg font-semibold tracking-tight hover:opacity-70 transition-opacity"
        >
          SWDB
        </button>
        <Input
          placeholder={isMdUp ? "Search title, series, author…" : "Search…"}
          value={q}
          onChange={(e) => {
            const newQ = e.target.value;
            // When transitioning from empty to non-empty, clear era/decade selection.
            if (!previousQ.current && newQ) {
              set({ q: newQ, eras: [], decades: [] });
            } else {
              set({ q: newQ });
            }
            previousQ.current = newQ;
          }}
          className="max-w-md"
        />
        <div className="ml-auto flex items-center gap-2">
          <div className="flex rounded-md border bg-background">
            {VIEW_OPTIONS.map(({ value, label, Icon }) => (
              <Button
                key={value}
                variant={view === value ? "default" : "ghost"}
                size="icon-sm"
                onClick={() => set({ view: value })}
                className="rounded-none first:rounded-l-md last:rounded-r-md"
                aria-label={label}
                title={label}
              >
                <Icon />
              </Button>
            ))}
          </div>
          <div className="flex rounded-md border bg-background">
            {SORT_OPTIONS.map(({ value, label, Icon }) => (
              <Button
                key={value}
                variant={sort === value ? "default" : "ghost"}
                size="icon-sm"
                onClick={() => onSelectSort(value)}
                className="rounded-none first:rounded-l-md last:rounded-r-md"
                aria-label={label}
                title={label}
              >
                <Icon />
              </Button>
            ))}
          </div>
        </div>
      </header>
      <MobileSidebar open={drawerOpen} onOpenChange={setDrawerOpen} />
    </>
  );
}
