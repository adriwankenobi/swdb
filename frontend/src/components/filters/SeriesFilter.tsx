import { useCatalogStore } from "@/store/catalogStore";
import { useFilterStore } from "@/store/filterStore";
import { FacetMultiSelect } from "./_FacetMultiSelect";

export function SeriesFilter() {
  const facets = useCatalogStore((s) => s.facets.series);
  const { series, toggleArrayValue } = useFilterStore();
  return (
    <FacetMultiSelect
      title="Series"
      facets={facets}
      selected={series}
      onToggle={(v) => toggleArrayValue("series", v)}
    />
  );
}
