import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useFilterStore } from "@/store/filterStore";

export function ActiveFilterChips() {
  const s = useFilterStore();
  const chips: { key: string; label: string; clear: () => void }[] = [];
  s.eras.forEach((era) =>
    chips.push({ key: `era:${era}`, label: era, clear: () => s.toggleArrayValue("eras", era) }),
  );
  s.mediums.forEach((medium) =>
    chips.push({ key: `medium:${medium}`, label: medium, clear: () => s.toggleArrayValue("mediums", medium) }),
  );
  s.decades.forEach((dec) =>
    chips.push({ key: `decade:${dec}`, label: `${dec}s`, clear: () => s.toggleArrayValue("decades", dec) }),
  );
  if (s.releaseUndated) {
    chips.push({
      key: "releaseUndated",
      label: "Undated",
      clear: () => s.set({ releaseUndated: false }),
    });
  }
  s.series.forEach((m) =>
    chips.push({ key: `series:${m}`, label: m, clear: () => s.toggleArrayValue("series", m) }),
  );
  s.authors.forEach((m) =>
    chips.push({ key: `author:${m}`, label: m, clear: () => s.toggleArrayValue("authors", m) }),
  );
  s.publishers.forEach((m) =>
    chips.push({ key: `publisher:${m}`, label: m, clear: () => s.toggleArrayValue("publishers", m) }),
  );
  if (s.q) chips.push({ key: `q:${s.q}`, label: `"${s.q}"`, clear: () => s.set({ q: "" }) });
  if (chips.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-2 pb-3">
      {chips.map((c) => (
        <Badge key={c.key} variant="secondary" className="cursor-pointer" onClick={c.clear}>
          {c.label} ×
        </Badge>
      ))}
      <Button variant="ghost" size="sm" onClick={() => s.clearAll()}>
        Clear all
      </Button>
    </div>
  );
}
