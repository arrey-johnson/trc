import { previousDay } from "./streak";

/** Last N calendar days ending on `endDate` (inclusive), oldest first. */
export function getDateRange(endDate: string, count: number): string[] {
  const days: string[] = [];
  let cursor = endDate;
  for (let i = 0; i < count; i++) {
    days.unshift(cursor);
    cursor = previousDay(cursor);
  }
  return days;
}

export function weekdayShort(
  dateStr: string,
  timezone = "Africa/Douala"
): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  return new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    weekday: "short",
  }).format(date);
}

export function formatWeekRange(
  startDate: string,
  endDate: string,
  timezone = "Africa/Douala"
): string {
  const fmt = (d: string) => {
    const [y, m, day] = d.split("-").map(Number);
    const date = new Date(Date.UTC(y, m - 1, day, 12, 0, 0));
    return new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      month: "short",
      day: "numeric",
    }).format(date);
  };
  return `${fmt(startDate)} – ${fmt(endDate)}`;
}
