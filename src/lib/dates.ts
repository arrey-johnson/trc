import { DEFAULT_TIMEZONE } from "./constants";

/** Returns YYYY-MM-DD in the given IANA timezone. */
export function getTodayInTimezone(timezone = DEFAULT_TIMEZONE): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: timezone }).format(
    new Date()
  );
}

/** Formats a date string for WhatsApp reports, e.g. "Mon, June 22". */
export function formatReportDate(
  dateStr: string,
  timezone = DEFAULT_TIMEZONE
): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  return new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    weekday: "short",
    month: "long",
    day: "numeric",
  }).format(date);
}
