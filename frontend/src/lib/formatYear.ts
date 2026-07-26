function formatOne(year: number): string {
  const abs = Math.abs(year).toLocaleString("en-US");
  return year >= 0 ? `${abs} ABY` : `${abs} BBY`;
}

// NON-CANON works sit outside the in-universe chronology and carry no year;
// they render as nothing rather than a placeholder label.
export function formatYear(year: number | undefined, yearEnd?: number): string {
  if (year === undefined) {
    return "";
  }
  if (yearEnd === undefined || yearEnd === year) {
    return formatOne(year);
  }
  return `${formatOne(year)} - ${formatOne(yearEnd)}`;
}
