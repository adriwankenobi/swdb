export function formatYear(year: number): string {
  const abs = Math.abs(year);
  const formatted = abs.toLocaleString("en-US");
  return year >= 0 ? `${formatted} ABY` : `${formatted} BBY`;
}
