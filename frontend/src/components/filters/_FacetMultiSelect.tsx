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
        className="h-8"
      />
      <ScrollArea className="h-48 rounded-md border">
        <ul className="space-y-1 p-2">
          {filtered.map((f) => (
            <li key={f.value} className="flex items-center gap-2">
              <Checkbox
                id={`${title}-${f.value}`}
                checked={selected.includes(f.value)}
                onCheckedChange={() => onToggle(f.value)}
              />
              <label
                htmlFor={`${title}-${f.value}`}
                className="cursor-pointer truncate text-sm"
              >
                {f.label}
              </label>
              <span className="ml-auto text-xs text-muted-foreground">{f.count}</span>
            </li>
          ))}
        </ul>
      </ScrollArea>
    </section>
  );
}
