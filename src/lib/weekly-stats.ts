import type { Checkin, CheckinStatus, RoutineType } from "./types";

export type DayStatus = "none" | CheckinStatus;

export interface RoutineWeekStats {
  routineId: string;
  routineType: RoutineType;
  days: { date: string; status: DayStatus }[];
  loggedCount: number;
  completeCount: number;
  streak: number;
}

export interface WeeklyReport {
  days: string[];
  routines: RoutineWeekStats[];
  totalSlots: number;
  loggedCount: number;
  completeCount: number;
  partialCount: number;
  missedCount: number;
  logRatePercent: number;
  topMissReasons: { reason: string; count: number }[];
  message: string;
  tone: "celebrate" | "solid" | "grow" | "fresh";
}

function streakEndingOn(
  checkins: Pick<Checkin, "date">[],
  endDate: string
): number {
  const dates = new Set(checkins.map((c) => c.date));
  let streak = 0;
  let cursor = endDate;
  while (dates.has(cursor)) {
    streak += 1;
    cursor = shiftDay(cursor, -1);
  }
  return streak;
}

function shiftDay(dateStr: string, delta: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  date.setUTCDate(date.getUTCDate() + delta);
  return date.toISOString().slice(0, 10);
}

function encouragement(logRatePercent: number): {
  message: string;
  tone: WeeklyReport["tone"];
} {
  if (logRatePercent >= 85) {
    return {
      message: "Celebrate yourself — you're showing up consistently!",
      tone: "celebrate",
    };
  }
  if (logRatePercent >= 60) {
    return {
      message: "Solid effort this week. Keep the momentum going.",
      tone: "solid",
    };
  }
  if (logRatePercent >= 35) {
    return {
      message: "Room to grow — pick one routine and protect it daily.",
      tone: "grow",
    };
  }
  return {
    message: "Fresh start energy — one check-in today is a win.",
    tone: "fresh",
  };
}

export function buildWeeklyReport(params: {
  days: string[];
  routines: { id: string; type: RoutineType }[];
  checkins: Pick<Checkin, "id" | "routine_id" | "date" | "status">[];
  missReasons: (string | null)[];
  today: string;
}): WeeklyReport {
  const { days, routines, checkins, missReasons, today } = params;
  const daySet = new Set(days);

  const routineStats: RoutineWeekStats[] = routines.map((routine) => {
    const routineCheckins = checkins.filter(
      (c) => c.routine_id === routine.id && daySet.has(c.date)
    );
    const byDate = new Map(routineCheckins.map((c) => [c.date, c.status]));

    const dayRows = days.map((date) => ({
      date,
      status: (byDate.get(date) ?? "none") as DayStatus,
    }));

    return {
      routineId: routine.id,
      routineType: routine.type,
      days: dayRows,
      loggedCount: routineCheckins.length,
      completeCount: routineCheckins.filter((c) => c.status === "complete")
        .length,
      streak: streakEndingOn(routineCheckins, today),
    };
  });

  const weekCheckins = checkins.filter((c) => daySet.has(c.date));
  const totalSlots = routines.length * days.length;
  const loggedCount = weekCheckins.length;
  const completeCount = weekCheckins.filter((c) => c.status === "complete").length;
  const partialCount = weekCheckins.filter((c) => c.status === "partial").length;
  const missedCount = weekCheckins.filter((c) => c.status === "missed").length;
  const logRatePercent =
    totalSlots > 0 ? Math.round((loggedCount / totalSlots) * 100) : 0;

  const reasonCounts = new Map<string, number>();
  for (const reason of missReasons) {
    const trimmed = reason?.trim();
    if (!trimmed) continue;
    reasonCounts.set(trimmed, (reasonCounts.get(trimmed) ?? 0) + 1);
  }
  const topMissReasons = Array.from(reasonCounts.entries())
    .map(([reason, count]) => ({ reason, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 3);

  const { message, tone } = encouragement(logRatePercent);

  return {
    days,
    routines: routineStats,
    totalSlots,
    loggedCount,
    completeCount,
    partialCount,
    missedCount,
    logRatePercent,
    topMissReasons,
    message,
    tone,
  };
}

export function dayStatusEmoji(status: DayStatus): string {
  switch (status) {
    case "complete":
      return "✅";
    case "partial":
      return "🟡";
    case "missed":
      return "❌";
    default:
      return "·";
  }
}

export function dayStatusLabel(status: DayStatus): string {
  switch (status) {
    case "complete":
      return "Complete";
    case "partial":
      return "Partial";
    case "missed":
      return "Missed";
    default:
      return "No log";
  }
}

export type NonNegotiableDayStatus = "none" | "won" | "pending" | "missed";

export interface NonNegotiableDayStats {
  date: string;
  status: NonNegotiableDayStatus;
  total: number;
  completed: number;
}

export interface NonNegotiableWeekStats {
  days: NonNegotiableDayStats[];
  winCount: number;
  daysWithItems: number;
  todayWon: boolean;
  todayHasItems: boolean;
  todayTotal: number;
  todayCompleted: number;
}

export function buildNonNegotiableWeekStats(params: {
  days: string[];
  items: { date: string; is_completed: boolean }[];
  today: string;
}): NonNegotiableWeekStats {
  const { days, items, today } = params;

  const dayRows: NonNegotiableDayStats[] = days.map((date) => {
    const dayItems = items.filter((i) => i.date === date);
    const total = dayItems.length;
    const completed = dayItems.filter((i) => i.is_completed).length;

    if (total === 0) {
      return { date, status: "none", total, completed };
    }
    if (completed === total) {
      return { date, status: "won", total, completed };
    }
    if (date === today) {
      return { date, status: "pending", total, completed };
    }
    return { date, status: "missed", total, completed };
  });

  const daysWithItems = dayRows.filter((d) => d.total > 0).length;
  const winCount = dayRows.filter((d) => d.status === "won").length;
  const todayRow = dayRows.find((d) => d.date === today);

  return {
    days: dayRows,
    winCount,
    daysWithItems,
    todayWon: todayRow?.status === "won",
    todayHasItems: (todayRow?.total ?? 0) > 0,
    todayTotal: todayRow?.total ?? 0,
    todayCompleted: todayRow?.completed ?? 0,
  };
}

export function nonNegotiableDayEmoji(status: NonNegotiableDayStatus): string {
  switch (status) {
    case "won":
      return "🏆";
    case "pending":
      return "⏳";
    case "missed":
      return "❌";
    default:
      return "·";
  }
}

export function nonNegotiableDayLabel(status: NonNegotiableDayStatus): string {
  switch (status) {
    case "won":
      return "Won the day";
    case "pending":
      return "In progress";
    case "missed":
      return "Did not win";
    default:
      return "No items";
  }
}
