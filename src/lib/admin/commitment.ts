import { buildWeeklyReport } from "@/lib/weekly-stats";
import { getTodayInTimezone } from "@/lib/dates";
import { getDateRange } from "@/lib/week";
import { previousDay } from "@/lib/streak";
import type {
  Checkin,
  CheckinStatus,
  RoutineType,
  User,
  WhatsappGroupRole,
} from "@/lib/types";

export type CommitmentTier =
  | "strong"
  | "steady"
  | "slipping"
  | "at_risk"
  | "inactive";

export type DaySlotStatus = CheckinStatus | "none";

export interface MemberStats {
  userId: string;
  displayName: string;
  phoneNumber: string;
  email: string;
  onboardingComplete: boolean;
  createdAt: string;
  timezone: string;
  role: WhatsappGroupRole;
  logRatePercent: number;
  completeCount: number;
  loggedCount: number;
  totalSlots: number;
  maxStreak: number;
  lastCheckinDate: string | null;
  daysSinceLastCheckin: number | null;
  todayMorning: DaySlotStatus;
  todayEvening: DaySlotStatus;
  tier: CommitmentTier;
  hasPush: boolean;
  topMissReasons: { reason: string; count: number }[];
  weekLoggedDates: string[];
}

export const TIER_LABELS: Record<CommitmentTier, string> = {
  strong: "Strong",
  steady: "Steady",
  slipping: "Slipping",
  at_risk: "At risk",
  inactive: "Inactive",
};

export const TIER_STYLES: Record<CommitmentTier, string> = {
  strong: "bg-brand-subtle text-brand-subtle-fg dark:bg-brand-subtle dark:text-brand-muted",
  steady: "bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300",
  slipping: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  at_risk: "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300",
  inactive: "bg-stone-200 text-stone-600 dark:bg-stone-700 dark:text-stone-300",
};

function daysBetween(fromDate: string, toDate: string): number {
  const [fy, fm, fd] = fromDate.split("-").map(Number);
  const [ty, tm, td] = toDate.split("-").map(Number);
  const from = Date.UTC(fy, fm - 1, fd);
  const to = Date.UTC(ty, tm - 1, td);
  return Math.round((to - from) / (1000 * 60 * 60 * 24));
}

export function computeCommitmentTier(params: {
  logRatePercent: number;
  maxStreak: number;
  daysSinceLastCheckin: number | null;
  onboardingComplete: boolean;
  loggedCount: number;
  createdAt: string;
  today: string;
}): CommitmentTier {
  const {
    logRatePercent,
    maxStreak,
    daysSinceLastCheckin,
    onboardingComplete,
    loggedCount,
    createdAt,
    today,
  } = params;

  const daysSinceSignup = daysBetween(createdAt.slice(0, 10), today);

  if (!onboardingComplete) return "inactive";
  if (loggedCount === 0 && daysSinceSignup >= 2) return "inactive";
  if (daysSinceLastCheckin !== null && daysSinceLastCheckin >= 14)
    return "inactive";

  if (
    logRatePercent < 30 ||
    (daysSinceLastCheckin !== null && daysSinceLastCheckin >= 3)
  ) {
    return "at_risk";
  }

  if (logRatePercent < 50) return "slipping";
  if (logRatePercent >= 80 && maxStreak >= 2) return "strong";
  if (logRatePercent >= 50) return "steady";

  return "slipping";
}

function slotStatus(
  routines: { id: string; type: RoutineType }[],
  checkinsByRoutine: Map<string, CheckinStatus>,
  type: RoutineType
): DaySlotStatus {
  const routine = routines.find((r) => r.type === type);
  if (!routine) return "none";
  return checkinsByRoutine.get(routine.id) ?? "none";
}

export function buildMemberStats(params: {
  user: User;
  routines: { id: string; type: RoutineType }[];
  weekCheckins: Pick<Checkin, "id" | "routine_id" | "date" | "status">[];
  todayCheckins: Pick<Checkin, "routine_id" | "status">[];
  missReasons: (string | null)[];
  hasPush: boolean;
  allCheckinDates: string[];
}): MemberStats {
  const { user, routines, weekCheckins, todayCheckins, missReasons, hasPush, allCheckinDates } =
    params;

  const today = getTodayInTimezone(user.timezone);
  const days = getDateRange(today, 7);

  const report = buildWeeklyReport({
    days,
    routines,
    checkins: weekCheckins,
    missReasons,
    today,
  });

  const maxStreak = report.routines.reduce(
    (max, r) => Math.max(max, r.streak),
    0
  );

  const lastCheckinDate =
    allCheckinDates.length > 0
      ? allCheckinDates.reduce((a, b) => (a > b ? a : b))
      : null;

  const daysSinceLastCheckin = lastCheckinDate
    ? daysBetween(lastCheckinDate, today)
    : null;

  const todayByRoutine = new Map(
    todayCheckins.map((c) => [c.routine_id, c.status as CheckinStatus])
  );

  const tier = computeCommitmentTier({
    logRatePercent: report.logRatePercent,
    maxStreak,
    daysSinceLastCheckin,
    onboardingComplete: user.onboarding_complete,
    loggedCount: report.loggedCount,
    createdAt: user.created_at,
    today,
  });

  const weekLoggedDates = Array.from(
    new Set(weekCheckins.map((c) => c.date))
  ).sort();

  return {
    userId: user.id,
    displayName: user.display_name || "Unnamed",
    phoneNumber: user.phone_number,
    email: user.email,
    onboardingComplete: user.onboarding_complete,
    createdAt: user.created_at,
    timezone: user.timezone,
    role: user.whatsapp_group_role,
    logRatePercent: report.logRatePercent,
    completeCount: report.completeCount,
    loggedCount: report.loggedCount,
    totalSlots: report.totalSlots,
    maxStreak,
    lastCheckinDate,
    daysSinceLastCheckin,
    todayMorning: slotStatus(routines, todayByRoutine, "morning"),
    todayEvening: slotStatus(routines, todayByRoutine, "evening"),
    tier,
    hasPush,
    topMissReasons: report.topMissReasons,
    weekLoggedDates,
  };
}

export function whatsappUrl(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  return `https://wa.me/${digits}`;
}

export function slotEmoji(status: DaySlotStatus): string {
  switch (status) {
    case "complete":
      return "✅";
    case "partial":
      return "🟡";
    case "missed":
      return "❌";
    default:
      return "—";
  }
}

/** Group log rate for a single calendar day across all active members. */
export function groupDayLogRate(
  members: MemberStats[],
  date: string,
  checkins: Pick<Checkin, "user_id" | "date">[],
  routineCountByUser: Map<string, number>
): number {
  let expected = 0;
  let logged = 0;

  for (const member of members) {
    if (!member.onboardingComplete) continue;
    const routines = routineCountByUser.get(member.userId) ?? 0;
    if (routines === 0) continue;
    expected += routines;
    logged += checkins.filter(
      (c) => c.user_id === member.userId && c.date === date
    ).length;
  }

  return expected > 0 ? Math.round((logged / expected) * 100) : 0;
}

export function getTrendDates(endDate: string, count: number): string[] {
  const days: string[] = [];
  let cursor = endDate;
  for (let i = 0; i < count; i++) {
    days.unshift(cursor);
    cursor = previousDay(cursor);
  }
  return days;
}
