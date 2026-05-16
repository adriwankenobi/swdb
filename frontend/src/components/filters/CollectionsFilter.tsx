import { useCatalogStore } from "@/store/catalogStore";
import { useFilterStore } from "@/store/filterStore";
import { FacetMultiSelect } from "./_FacetMultiSelect";

export function CollectionsFilter() {
  const facets = useCatalogStore((s) => s.facets.collections);
  const { collections, toggleArrayValue } = useFilterStore();
  return (
    <FacetMultiSelect
      title="Collections"
      facets={facets}
      selected={collections}
      onToggle={(v) => toggleArrayValue("collections", v)}
    />
  );
}
