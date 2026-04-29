function formatOne(year: number): string {
  const abs = Math.abs(year).toLocaleString("en-US");
  return year >= 0 ? `${abs} ABY` : `${abs} BBY`;
}

export function formatYear(year: number, yearEnd?: number): string {
  if (yearEnd === undefined || yearEnd === year) {
    return formatOne(year);
  }
  return `${formatOne(year)} - ${formatOne(yearEnd)}`;
}
