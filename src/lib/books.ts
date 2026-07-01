import type { BookFileFormat } from "@/lib/books/format";

export function readingPercent(currentPage: number, pageCount: number): number {
  if (pageCount <= 0) return 0;
  return Math.min(100, Math.round((currentPage / pageCount) * 100));
}

export function formatReadingProgress(
  format: BookFileFormat,
  currentPage: number,
  pageCount: number
): string {
  const percent = readingPercent(currentPage, pageCount);
  if (format === "epub") {
    return `${percent}% read`;
  }
  return `Page ${currentPage} of ${pageCount} (${percent}%)`;
}

export function formatBookProgressLabel(
  format: BookFileFormat,
  currentPage: number,
  pageCount: number
): string {
  if (format === "epub") {
    return `${readingPercent(currentPage, pageCount)}% read`;
  }
  return `Page ${currentPage} of ${pageCount}`;
}

export function isActiveReader(lastReadAt: string, hours = 48): boolean {
  const diff = Date.now() - new Date(lastReadAt).getTime();
  return diff < hours * 60 * 60 * 1000;
}

export { todayForUser } from "@/lib/books/dates";
