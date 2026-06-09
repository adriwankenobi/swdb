// Shared column definitions for TableView header and WorkRow cells.
// Widths are Tailwind fixed-width classes. Total ≈ 89rem; horizontal
// scroll appears only when the viewport is narrower than the column sum.
export const COLUMNS = [
  { key: "cover",     label: "Cover",     width: "w-14"  },  // 3.5rem
  { key: "series",    label: "Series",    width: "w-48"  },  // 12rem
  { key: "title",     label: "Title",     width: "w-64"  },  // 16rem
  { key: "medium",    label: "Medium",    width: "w-32"  },  // 8rem
  { key: "era",       label: "Era",       width: "w-44"  },  // 11rem
  { key: "year",      label: "Year",      width: "w-44"  },  // 11rem (fits "25,200 BBY - 671 BBY")
  { key: "release",   label: "Release",   width: "w-28"  },  // 7rem
  { key: "authors",   label: "Authors",   width: "w-56"  },  // 14rem
  { key: "publisher", label: "Publisher", width: "w-36"  },  // 9rem
] as const;

// The "Owned" toggle column is conditional (only rendered when signed in),
// so it lives outside COLUMNS. Header (TableView) and cell (WorkRow) share
// this width so they stay aligned.
export const OWNED_COLUMN_WIDTH = "w-20"; // 5rem

// The "Type" column is collection-only, so it's conditional too — rendered
// only in collections mode (where the Owned column is hidden), inserted
// between the Medium and Era columns. Lives outside COLUMNS; header
// (TableView) and cells (CollectionRow / WorkRow) share this width so they
// stay aligned.
export const COLLECTION_TYPE_COLUMN_WIDTH = "w-28"; // 7rem
