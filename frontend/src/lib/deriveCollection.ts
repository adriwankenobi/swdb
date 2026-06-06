import type { DerivedCollection, UserCollection, Work } from "../types/work";

/** Derive display/sort fields for a user collection from its member works.
 *  Unknown (orphan) member ids are skipped. Reading order is preserved. */
export function deriveCollection(
  raw: UserCollection,
  worksById: Map<string, Work>,
): DerivedCollection {
  const members = raw.member_ids
    .map((id) => worksById.get(id))
    .filter((w): w is Work => !!w);

  const eras = [...new Set(members.map((w) => w.era))];
  const mediums = [...new Set(members.map((w) => w.medium))];
  // Unions across members (a work may have several series/authors).
  const series = [...new Set(members.flatMap((w) => w.series ?? []))];
  const authors = [...new Set(members.flatMap((w) => w.authors ?? []))];
  const publishers = [
    ...new Set(members.map((w) => w.publisher).filter((p): p is string => !!p)),
  ];

  let year = 0;
  let yearEnd: number | undefined;
  let anchorEra: Work["era"] | "" = "";
  let releaseDate: string | undefined;
  let releasePrecision: Work["release_precision"];

  if (members.length > 0) {
    const earliest = members.reduce((a, b) => (b.year < a.year ? b : a));
    year = earliest.year;
    anchorEra = earliest.era;
    const maxEnd = Math.max(...members.map((w) => w.year_end ?? w.year));
    if (maxEnd !== year) yearEnd = maxEnd;
    const dated = members.filter((w) => w.release_date);
    if (dated.length > 0) {
      // Latest release among members (the collection is "complete" then).
      const maxRel = dated.reduce((a, b) =>
        (b.release_date ?? "") > (a.release_date ?? "") ? b : a,
      );
      releaseDate = maxRel.release_date;
      releasePrecision = maxRel.release_precision;
    }
  }

  return {
    id: raw.id,
    title: raw.title,
    number: raw.number,
    type: raw.type,
    info_url: raw.info_url,
    cover_url: raw.cover_url,
    member_ids: raw.member_ids,
    eras,
    mediums,
    series,
    authors,
    publishers,
    year,
    year_end: yearEnd,
    anchor_era: anchorEra,
    release_date: releaseDate,
    release_precision: releasePrecision,
  };
}
