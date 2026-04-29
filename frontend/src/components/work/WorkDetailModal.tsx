import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ERAS, ERA_COLORS, type EraIndex } from "@/constants/eras";
import { MEDIUMS } from "@/constants/mediums";
import { formatYear } from "@/lib/formatYear";
import { useCatalogStore } from "@/store/catalogStore";
import { useFilterStore } from "@/store/filterStore";

export function WorkDetailModal() {
  const { openWorkId, set } = useFilterStore();
  const works = useCatalogStore((s) => s.works);
  const work = openWorkId ? works.find((w) => w.id === openWorkId) : null;
  const mediumLabel = work ? MEDIUMS[work.medium] : "";

  return (
    <Dialog
      open={!!work}
      onOpenChange={(open) => {
        if (!open) set({ openWorkId: null });
      }}
    >
      <DialogContent className="max-w-3xl">
        {work && (
          <>
            <DialogHeader>
              <DialogTitle className="leading-tight">{work.title}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-6 sm:grid-cols-[240px_1fr]">
              <div className="aspect-[2/3] w-full overflow-hidden rounded-md bg-muted">
                {work.cover_url ? (
                  <a href={work.cover_url} target="_blank" rel="noopener noreferrer">
                    <img src={work.cover_url} alt="" className="h-full w-full object-cover" />
                  </a>
                ) : (
                  <div
                    className="flex h-full items-center justify-center text-5xl text-white/70"
                    style={{ backgroundColor: ERA_COLORS[work.era as EraIndex] }}
                  >
                    {mediumLabel[0]}
                  </div>
                )}
              </div>
              <div className="space-y-3 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  {work.series && (
                    <span className="font-medium">
                      {work.series}{work.number ? ` #${work.number}` : ""}
                    </span>
                  )}
                  <Badge variant="outline">{mediumLabel}</Badge>
                  <Badge style={{ backgroundColor: ERA_COLORS[work.era as EraIndex], color: "white" }}>
                    {ERAS[work.era]}
                  </Badge>
                </div>
                <p>
                  <span className="text-muted-foreground">In-universe year:</span>{" "}
                  {formatYear(work.year)}
                </p>
                {work.release_date && (
                  <p>
                    <span className="text-muted-foreground">Released:</span> {work.release_date}
                  </p>
                )}
                {work.authors && work.authors.length > 0 && (
                  <p>
                    <span className="text-muted-foreground">Authors:</span>{" "}
                    {work.authors.join(", ")}
                  </p>
                )}
                {work.publisher && (
                  <p>
                    <span className="text-muted-foreground">Publisher:</span> {work.publisher}
                  </p>
                )}
                {work.wiki_url && (
                  <p>
                    <a
                      href={work.wiki_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline"
                    >
                      Open on Wookieepedia →
                    </a>
                  </p>
                )}
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
