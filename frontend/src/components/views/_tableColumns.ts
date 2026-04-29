// Shared column definitions for TableView header and WorkRow cells.
// Widths are Tailwind fixed-width classes. Total ≈ 89rem; horizontal
// scroll appears only when the viewport is narrower than the column sum.
export const COLUMNS = [
  { key: "cover",     label: "Cover",     width: "w-14"  },  // 3.5rem
  { key: "title",     label: "Title",     width: "w-64"  },  // 16rem
  { key: "series",    label: "Series",    width: "w-48"  },  // 12rem
  { key: "number",    label: "#",         width: "w-12"  },  // 3rem
  { key: "medium",    label: "Medium",    width: "w-32"  },  // 8rem
  { key: "era",       label: "Era",       width: "w-44"  },  // 11rem
  { key: "year",      label: "Year",      width: "w-44"  },  // 11rem (fits "25,200 BBY - 671 BBY")
  { key: "release",   label: "Release",   width: "w-28"  },  // 7rem
  { key: "authors",   label: "Authors",   width: "w-56"  },  // 14rem
  { key: "publisher", label: "Publisher", width: "w-36"  },  // 9rem
] as const;
