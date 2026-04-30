import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ERA_COLORS } from "@/constants/eras";
import { MEDIUM_COLORS } from "@/constants/mediums";
import { formatYear } from "@/lib/formatYear";
import { formatReleaseDate } from "@/lib/formatReleaseDate";
import { formatSeriesAndNumber } from "@/lib/formatSeriesAndNumber";
import { useCatalogStore } from "@/store/catalogStore";
import { useFilterStore } from "@/store/filterStore";

function safeHttpUrl(url: string | undefined): string | undefined {
  if (!url) return undefined;
  return /^https?:\/\//i.test(url) ? url : undefined;
}

export function WorkDetailModal() {
  const { openWorkId, set, toggleArrayValue } = useFilterStore();
  const works = useCatalogStore((s) => s.works);
  const work = openWorkId ? works.find((w) => w.id === openWorkId) : null;

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
      <DialogContent
        className="!max-w-2xl max-h-[90vh] overflow-y-auto overflow-x-hidden"
        style={work?.color ? { backgroundColor: work.color } : undefined}
      >
        {work && (
          <>
            <DialogHeader>
              <DialogTitle className="leading-tight break-words">{work.title}</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col md:flex-row gap-6">
              <div className="w-full md:w-[200px] shrink-0 aspect-[2/3] overflow-hidden rounded-md bg-muted/40">
                {work.cover_url ? (() => {
                  const safeCover = safeHttpUrl(work.cover_url);
                  return safeCover ? (
                    <a href={safeCover} target="_blank" rel="noopener noreferrer">
                      <img src={safeCover} alt="" className="h-full w-full object-contain bg-muted/40" />
                    </a>
                  ) : (
                    <img src={work.cover_url} alt="" className="h-full w-full object-contain bg-muted/40" />
                  );
                })() : (
                  <div
                    className="flex h-full items-center justify-center px-3 text-center text-base font-semibold leading-snug text-white text-balance line-clamp-6 break-words"
                    style={{ backgroundColor: ERA_COLORS[work.era] }}
                  >
                    {work.title}
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1 space-y-3 text-sm">
                {work.series && (
                  <div>
                    <button
                      type="button"
                      className="font-medium cursor-pointer hover:underline break-words"
                      onClick={() => { toggleArrayValue("series", work.series!); closeModal(); }}
                    >
                      {formatSeriesAndNumber(work)}
                    </button>
                  </div>
                )}
                <div className="flex flex-wrap items-center gap-2">
                  <Badge style={{ backgroundColor: MEDIUM_COLORS[work.medium], color: "white" }}>{work.medium}</Badge>
                  <Badge style={{ backgroundColor: ERA_COLORS[work.era], color: "white" }}>
                    {work.era}
                  </Badge>
                </div>
                <p className="whitespace-nowrap">
                  <span className="text-muted-foreground">Year:</span>{" "}
                  {formatYear(work.year, work.year_end)}
                </p>
                {work.release_date && (
                  <p>
                    <span className="text-muted-foreground">Released:</span>{" "}
                    {formatReleaseDate(work.release_date, work.release_precision)}
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
                {safeHttpUrl(work.wiki_url) && (
                  <p className="break-words">
                    <a
                      href={safeHttpUrl(work.wiki_url)}
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
