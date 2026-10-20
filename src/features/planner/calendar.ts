/** Calendar-only arithmetic is independent of browser and host timezone. */
export function calendarDays(anchor: string): string[] {
  const first = new Date(anchor.slice(0, 7) + "-01T12:00:00Z");
  if (!Number.isFinite(first.getTime())) throw new Error("Invalid calendar date.");
  const last = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0, 12));
  const padding = (first.getUTCDay() + 6) % 7,
    total = Math.ceil((padding + last.getUTCDate()) / 7) * 7;
  return Array.from({ length: total }, (_, i) => {
    const date = new Date(first);
    date.setUTCDate(i - padding + 1);
    return date.toISOString().slice(0, 10);
  });
}
export function shiftMonth(anchor: string, months: number) {
  const date = new Date(anchor.slice(0, 7) + "-01T12:00:00Z");
  date.setUTCMonth(date.getUTCMonth() + months);
  return date.toISOString().slice(0, 10);
}
