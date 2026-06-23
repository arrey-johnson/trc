import { getTodayInTimezone } from "@/lib/dates";

export function readingPercent(currentPage: number, pageCount: number): number {
  if (pageCount <= 0) return 0;
  return Math.min(100, Math.round((currentPage / pageCount) * 100));
}

export function formatReadingProgress(
  currentPage: number,
  pageCount: number
): string {
  return `Page ${currentPage} of ${pageCount} (${readingPercent(currentPage, pageCount)}%)`;
}

export function isActiveReader(lastReadAt: string, hours = 48): boolean {
  const diff = Date.now() - new Date(lastReadAt).getTime();
  return diff < hours * 60 * 60 * 1000;
}

export function todayForUser(timezone: string): string {
  return getTodayInTimezone(timezone);
}
