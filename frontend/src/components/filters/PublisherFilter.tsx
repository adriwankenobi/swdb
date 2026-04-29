import { useCatalogStore } from "@/store/catalogStore";
import { useFilterStore } from "@/store/filterStore";
import { FacetMultiSelect } from "./_FacetMultiSelect";

export function PublisherFilter() {
  const facets = useCatalogStore((s) => s.facets.publishers);
  const { publishers, toggleArrayValue } = useFilterStore();
  return (
    <FacetMultiSelect
      title="Publisher"
      facets={facets}
      selected={publishers}
      onToggle={(v) => toggleArrayValue("publishers", v)}
    />
  );
}
