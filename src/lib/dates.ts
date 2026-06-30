import { DEFAULT_TIMEZONE } from "./constants";

/** Returns HH:MM (24h) in the given IANA timezone. */
export function getCurrentTimeInTimezone(timezone = DEFAULT_TIMEZONE): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date());
}

/** Compare two HH:MM or HH:MM:SS time strings. Returns negative if a < b. */
export function compareTimeStrings(a: string, b: string): number {
  const [ah, am] = a.slice(0, 5).split(":").map(Number);
  const [bh, bm] = b.slice(0, 5).split(":").map(Number);
  return ah * 60 + am - (bh * 60 + bm);
}

/** True when local time in timezone is at or after evening_reminder_time. */
export function isEveningInTimezone(
  timezone: string,
  eveningReminderTime: string
): boolean {
  const now = getCurrentTimeInTimezone(timezone);
  const evening = eveningReminderTime.slice(0, 5);
  return compareTimeStrings(now, evening) >= 0;
}

/** Formats a time string for display, e.g. "9:00 PM". */
export function formatTimeForDisplay(time: string): string {
  const [h, m] = time.slice(0, 5).split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 || 12;
  return `${hour12}:${String(m).padStart(2, "0")} ${period}`;
}

/** Returns YYYY-MM-DD in the given IANA timezone. */
export function getTodayInTimezone(timezone = DEFAULT_TIMEZONE): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: timezone }).format(
    new Date()
  );
}

/** Returns a calendar date N days before today in the given timezone. */
export function getDaysAgoInTimezone(
  timezone: string,
  daysAgo: number
): string {
  const today = getTodayInTimezone(timezone);
  const [year, month, day] = today.split("-").map(Number);
  const anchor = new Date(Date.UTC(year, month - 1, day - daysAgo, 12, 0, 0));
  return new Intl.DateTimeFormat("en-CA", { timeZone: timezone }).format(anchor);
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
