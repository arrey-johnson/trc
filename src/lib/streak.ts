import type { Checkin, RoutineType } from "./types";

/**
 * Consecutive days with a submitted check-in ending on `endDate` (inclusive).
 * A day counts if any check-in exists for that routine on that date.
 */
export function calculateStreak(
  checkins: Pick<Checkin, "date">[],
  endDate: string
): number {
  const dates = new Set(checkins.map((c) => c.date));
  let streak = 0;
  let cursor = endDate;

  while (dates.has(cursor)) {
    streak += 1;
    cursor = previousDay(cursor);
  }

  return streak;
}

export function previousDay(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  date.setUTCDate(date.getUTCDate() - 1);
  return date.toISOString().slice(0, 10);
}

export function deriveCheckinStatus(
  answers: { wasDone: boolean }[]
): "complete" | "partial" | "missed" {
  const doneCount = answers.filter((a) => a.wasDone).length;
  if (doneCount === 0) return "missed";
  if (doneCount === answers.length) return "complete";
  return "partial";
}

export function routineTypeFromPath(type: string): RoutineType | null {
  if (type === "morning" || type === "evening") return type;
  return null;
}
