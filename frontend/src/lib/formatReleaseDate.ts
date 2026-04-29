const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export function formatReleaseDate(
  iso: string,
  precision: "day" | "month" | "year" = "day",
): string {
  const [y, m, d] = iso.split("-");
  if (precision === "year") return y;
  const monthName = MONTH_NAMES[parseInt(m, 10) - 1] ?? m;
  if (precision === "month") return `${monthName} ${y}`;
  return `${monthName} ${parseInt(d, 10)}, ${y}`;
}

// Compact ISO-truncated form for tabular display: "1976-11-12" / "1976-11" / "1976".
// Sortable and unambiguous about precision without spending the column width
// of the long-form English version.
export function formatReleaseDateCompact(
  iso: string,
  precision: "day" | "month" | "year" = "day",
): string {
  const parts = iso.split("-");
  if (precision === "year") return parts[0];
  if (precision === "month") return parts.slice(0, 2).join("-");
  return iso;
}
