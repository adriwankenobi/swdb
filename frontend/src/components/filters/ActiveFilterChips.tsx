import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ERAS } from "@/constants/eras";
import { MEDIUMS } from "@/constants/mediums";
import { useFilterStore } from "@/store/filterStore";

export function ActiveFilterChips() {
  const s = useFilterStore();
  const chips: { label: string; clear: () => void }[] = [];
  s.eras.forEach((e) =>
    chips.push({ label: ERAS[e], clear: () => s.toggleArrayValue("eras", e) }),
  );
  s.mediums.forEach((m) =>
    chips.push({ label: MEDIUMS[m], clear: () => s.toggleArrayValue("mediums", m) }),
  );
  s.series.forEach((m) =>
    chips.push({ label: m, clear: () => s.toggleArrayValue("series", m) }),
  );
  s.authors.forEach((m) =>
    chips.push({ label: m, clear: () => s.toggleArrayValue("authors", m) }),
  );
  s.publishers.forEach((m) =>
    chips.push({ label: m, clear: () => s.toggleArrayValue("publishers", m) }),
  );
  if (s.q) chips.push({ label: `"${s.q}"`, clear: () => s.set({ q: "" }) });
  if (s.yearMin !== null || s.yearMax !== null) {
    chips.push({
      label: "year",
      clear: () => s.set({ yearMin: null, yearMax: null }),
    });
  }
  if (chips.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-2 pb-3">
      {chips.map((c, i) => (
        <Badge key={i} variant="secondary" className="cursor-pointer" onClick={c.clear}>
          {c.label} ×
        </Badge>
      ))}
      <Button variant="ghost" size="sm" onClick={() => s.clearAll()}>
        Clear all
      </Button>
    </div>
  );
}
