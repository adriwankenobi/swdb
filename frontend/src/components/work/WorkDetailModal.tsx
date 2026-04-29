import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ERAS, ERA_COLORS, type EraIndex } from "@/constants/eras";
import { MEDIUMS, MEDIUM_COLORS } from "@/constants/mediums";
import { formatYear } from "@/lib/formatYear";
import { formatSeriesAndNumber } from "@/lib/formatSeriesAndNumber";
import { useCatalogStore } from "@/store/catalogStore";
import { useFilterStore } from "@/store/filterStore";

export function WorkDetailModal() {
  const { openWorkId, set, toggleArrayValue } = useFilterStore();
  const works = useCatalogStore((s) => s.works);
  const work = openWorkId ? works.find((w) => w.id === openWorkId) : null;
  const mediumLabel = work ? MEDIUMS[work.medium] : "";

  function closeModal() {
    set({ openWorkId: null });
  }

  return (
    <Dialog
      open={!!work}
      onOpenChange={(open) => {
        if (!open) set({ openWorkId: null });
      }}
    >
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto overflow-x-hidden">
        {work && (
          <>
            <DialogHeader>
              <DialogTitle className="leading-tight break-words">{work.title}</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col md:flex-row gap-6">
              <div className="w-full md:w-[200px] shrink-0 aspect-[2/3] overflow-hidden rounded-md bg-muted/40">
                {work.cover_url ? (
                  <a href={work.cover_url} target="_blank" rel="noopener noreferrer">
                    <img src={work.cover_url} alt="" className="h-full w-full object-contain bg-muted/40" />
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
              <div className="min-w-0 flex-1 space-y-3 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  {work.series && (
                    <button
                      type="button"
                      className="font-medium cursor-pointer hover:underline break-words"
                      onClick={() => { toggleArrayValue("series", work.series!); closeModal(); }}
                    >
                      {formatSeriesAndNumber(work)}
                    </button>
                  )}
                  <Badge style={{ backgroundColor: MEDIUM_COLORS[work.medium], color: "white" }}>{mediumLabel}</Badge>
                  <Badge style={{ backgroundColor: ERA_COLORS[work.era as EraIndex], color: "white" }}>
                    {ERAS[work.era]}
                  </Badge>
                </div>
                <p>
                  <span className="text-muted-foreground">Year:</span>{" "}
                  {formatYear(work.year)}
                </p>
                {work.release_date && (
                  <p>
                    <span className="text-muted-foreground">Released:</span> {work.release_date}
                  </p>
                )}
                {work.authors && work.authors.length > 0 && (
                  <p className="break-words">
                    <span className="text-muted-foreground">Authors:</span>{" "}
                    {work.authors.map((author, i) => (
                      <span key={author}>
                        {i > 0 && ", "}
                        <button
                          type="button"
                          className="cursor-pointer hover:underline"
                          onClick={() => { toggleArrayValue("authors", author); closeModal(); }}
                        >
                          {author}
                        </button>
                      </span>
                    ))}
                  </p>
                )}
                {work.publisher && (
                  <p className="break-words">
                    <span className="text-muted-foreground">Publisher:</span>{" "}
                    <button
                      type="button"
                      className="cursor-pointer hover:underline"
                      onClick={() => { toggleArrayValue("publishers", work.publisher!); closeModal(); }}
                    >
                      {work.publisher}
                    </button>
                  </p>
                )}
                {work.wiki_url && (
                  <p className="break-words">
                    <a
                      href={work.wiki_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline inline-block"
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
