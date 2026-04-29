import { Checkbox } from "@/components/ui/checkbox";
import { useCatalogStore } from "@/store/catalogStore";
import { useFilterStore } from "@/store/filterStore";

export function MediumFilter() {
  const mediums = useCatalogStore((s) => s.facets.mediums);
  const { mediums: selected, toggleArrayValue } = useFilterStore();
  return (
    <section className="space-y-2">
      <h3 className="text-sm font-medium">Medium</h3>
      <ul className="space-y-1">
        {mediums.map((f) => (
          <li key={f.value} className="flex items-center gap-2">
            <Checkbox
              id={`medium-${f.value}`}
              checked={selected.includes(f.value)}
              onCheckedChange={() => toggleArrayValue("mediums", f.value)}
            />
            <label htmlFor={`medium-${f.value}`} className="cursor-pointer text-sm">
              {f.label}
            </label>
            <span className="ml-auto text-xs text-muted-foreground">{f.count}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
