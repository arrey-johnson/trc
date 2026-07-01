import { getTodayInTimezone } from "@/lib/dates";

export function todayForUser(timezone: string): string {
  return getTodayInTimezone(timezone);
}
