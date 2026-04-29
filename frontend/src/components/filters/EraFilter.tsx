import { Checkbox } from "@/components/ui/checkbox";
import { ERAS, ERA_COLORS, type EraIndex } from "@/constants/eras";
import { useFilterStore } from "@/store/filterStore";

export function EraFilter() {
  const { eras, toggleArrayValue } = useFilterStore();
  return (
    <section className="space-y-2">
      <h3 className="text-sm font-medium">Era</h3>
      <ul className="space-y-1">
        {ERAS.map((label, i) => {
          const idx = i as EraIndex;
          return (
            <li key={label} className="flex items-center gap-2">
              <Checkbox
                id={`era-${idx}`}
                checked={eras.includes(idx)}
                onCheckedChange={() => toggleArrayValue("eras", idx)}
              />
              <span
                className="size-2 rounded-full"
                style={{ backgroundColor: ERA_COLORS[idx] }}
              />
              <label htmlFor={`era-${idx}`} className="cursor-pointer text-sm">
                {label}
              </label>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
