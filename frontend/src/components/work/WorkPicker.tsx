import { useMemo, useState } from "react";
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandItem,
} from "@/components/ui/command";
import { useCatalogStore } from "@/store/catalogStore";
import { formatSeriesAndNumber, formatWorkTitle } from "@/lib/formatSeriesAndNumber";

export function WorkPicker({
  exclude,
  onPick,
}: {
  exclude: Set<string>;
  onPick: (workId: string) => void;
}) {
  const works = useCatalogStore((s) => s.works);
  const [q, setQ] = useState("");

  const results = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return [];
    const out = [] as typeof works;
    for (const w of works) {
      if (exclude.has(w.id)) continue;
      // Match the title OR any of the work's series names.
      const matches =
        w.title.toLowerCase().includes(query) ||
        (w.series ?? []).some((s) => s.toLowerCase().includes(query));
      if (matches) out.push(w);
      if (out.length >= 30) break; // cap the list
    }
    return out;
  }, [q, works, exclude]);

  return (
    <Command shouldFilter={false} className="border">
      <CommandInput
        value={q}
        onValueChange={setQ}
        placeholder="Search works to add…"
      />
      <CommandList>
        {q.trim() && results.length === 0 && (
          <CommandEmpty>No matches.</CommandEmpty>
        )}
        {results.map((w) => (
          <CommandItem
            key={w.id}
            value={w.id}
            onSelect={() => {
              onPick(w.id);
              setQ("");
            }}
          >
            {/* formatWorkTitle, not w.title: issues of a mini-series differ
                only by the per-work #, so without it they all look alike. */}
            <span className="truncate">{formatWorkTitle(w)}</span>
            {formatSeriesAndNumber(w) && (
              <span className="ml-2 shrink-0 text-xs text-muted-foreground">
                {formatSeriesAndNumber(w)}
              </span>
            )}
            <span className="ml-auto shrink-0 pl-2 text-xs text-muted-foreground">
              {w.era}
            </span>
          </CommandItem>
        ))}
      </CommandList>
    </Command>
  );
}
