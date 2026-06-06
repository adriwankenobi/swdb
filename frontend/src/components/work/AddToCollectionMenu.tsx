import { useMemo, useState } from "react";
import { PlusIcon, ChevronDownIcon, CheckIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandItem,
} from "@/components/ui/command";
import { useUserStore } from "@/store/userStore";
import { useEditorStore } from "@/store/editorStore";
import { useFilterStore } from "@/store/filterStore";
import { formatCollectionTitle } from "@/lib/formatSeriesAndNumber";

/** Inline (non-popover) "add to collection" control for the work modal.
 *  Rendered inline rather than in a Popover because this lives inside the
 *  work-detail Dialog, and a nested portaled popover doesn't render reliably
 *  under the dialog's focus trap. Uses a search box (rather than listing every
 *  collection) so it stays usable with hundreds of collections. */
export function AddToCollectionMenu({ workId }: { workId: string }) {
  const session = useUserStore((s) => s.session);
  const collections = useUserStore((s) => s.collections);
  const setCollectionMembers = useUserStore((s) => s.setCollectionMembers);
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");

  const results = useMemo(() => {
    const query = q.trim().toLowerCase();
    // No query: show only the collections this work already belongs to, so they
    // stay visible/removable without scrolling through hundreds of entries.
    if (!query) return collections.filter((c) => c.member_ids.includes(workId));
    const out: typeof collections = [];
    for (const c of collections) {
      if (formatCollectionTitle(c).toLowerCase().includes(query)) out.push(c);
      if (out.length >= 50) break; // cap the list
    }
    return out;
  }, [q, collections, workId]);

  if (!session) return null;

  function toggle(collectionId: string, member_ids: string[]) {
    const next = member_ids.includes(workId)
      ? member_ids.filter((id) => id !== workId)
      : [...member_ids, workId];
    void setCollectionMembers(collectionId, next);
  }

  return (
    <div>
      <Button variant="ghost" size="sm" className="px-0" onClick={() => setOpen((o) => !o)}>
        <PlusIcon className="size-4" />
        <span className="ml-1">Add to collection</span>
        <ChevronDownIcon className={`ml-1 size-3.5 transition-transform ${open ? "rotate-180" : ""}`} />
      </Button>
      {open && (
        <div className="mt-1 space-y-1 rounded-md border p-2">
          {collections.length === 0 ? (
            <p className="px-1 text-xs text-muted-foreground">No collections yet.</p>
          ) : (
            <Command shouldFilter={false} className="border">
              <CommandInput
                value={q}
                onValueChange={setQ}
                placeholder="Search collections…"
              />
              <CommandList>
                {q.trim() && results.length === 0 && (
                  <CommandEmpty>No matches.</CommandEmpty>
                )}
                {results.map((c) => {
                  const member = c.member_ids.includes(workId);
                  return (
                    <CommandItem
                      key={c.id}
                      value={c.id}
                      onSelect={() => toggle(c.id, c.member_ids)}
                    >
                      <CheckIcon
                        className={`size-4 shrink-0 ${member ? "opacity-100" : "opacity-0"}`}
                      />
                      <span className="ml-2 truncate">{formatCollectionTitle(c)}</span>
                    </CommandItem>
                  );
                })}
              </CommandList>
            </Command>
          )}
          <button
            type="button"
            className="mt-1 flex w-full items-center gap-1 border-t pt-2 text-sm text-muted-foreground hover:text-foreground"
            onClick={() => {
              // Close the work modal first, then open the editor seeded with this work.
              useFilterStore.getState().set({ openWorkId: null });
              useEditorStore.getState().openNew(workId);
            }}
          >
            <PlusIcon className="size-4" /> New collection…
          </button>
        </div>
      )}
    </div>
  );
}
