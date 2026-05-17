import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Facet {
  value: string;
  label: string;
  count: number;
}

interface Props {
  title: string;
  facets: Facet[];
  selected: string[];
  onToggle: (value: string) => void;
}

export function FacetMultiSelect({ title, facets, selected, onToggle }: Props) {
  const [q, setQ] = useState("");
  const filtered = q
    ? facets.filter((f) => f.label.toLowerCase().includes(q.toLowerCase()))
    : facets;
  return (
    <section className="space-y-2">
      <h3 className="text-sm font-medium">{title}</h3>
      <Input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={`Search ${title.toLowerCase()}…`}
        className="h-7 text-xs"
      />
      <ScrollArea className="h-20 rounded-md border">
        <ul className="space-y-0.5 p-1">
          {filtered.map((f) => (
            <li key={f.value}>
              <label
                htmlFor={`${title}-${f.value}`}
                className="flex w-full cursor-pointer items-center gap-2 text-xs"
              >
                <Checkbox
                  id={`${title}-${f.value}`}
                  checked={selected.includes(f.value)}
                  onCheckedChange={() => onToggle(f.value)}
                />
                <span className="truncate">{f.label}</span>
                <span className="ml-auto text-muted-foreground">{f.count}</span>
              </label>
            </li>
          ))}
        </ul>
      </ScrollArea>
    </section>
  );
}
