import type { SupabaseClient } from "@supabase/supabase-js";
import { getTodayInTimezone } from "@/lib/dates";
import { getDateRange } from "@/lib/week";
import {
  buildMemberStats,
  type MemberStats,
  groupDayLogRate,
  getTrendDates,
} from "@/lib/admin/commitment";
import type { User } from "@/lib/types";

export interface AdminDashboardData {
  members: MemberStats[];
  tierCounts: Record<MemberStats["tier"], number>;
  onboardedCount: number;
  totalMembers: number;
  todayMorningDone: number;
  todayEveningDone: number;
  todayNotLogged: number;
  groupLogRate7d: number;
  trendDays: { date: string; logRate: number }[];
  topGroupMissReasons: { reason: string; count: number }[];
}

export interface AdminMemberDetail extends MemberStats {
  weekReport: ReturnType<
    typeof import("@/lib/weekly-stats").buildWeeklyReport
  >;
  routines: { id: string; type: "morning" | "evening" }[];
  recentMissReasons: { reason: string; date: string; itemLabel: string }[];
  reminderActionRate: number | null;
}

async function fetchPushUserIds(
  supabase: SupabaseClient
): Promise<Set<string>> {
  const { data } = await supabase.from("push_subscriptions").select("user_id");
  return new Set((data ?? []).map((r) => r.user_id as string));
}

export async function fetchAllMemberStats(
  supabase: SupabaseClient
): Promise<MemberStats[]> {
  const { data: users } = await supabase
    .from("users")
    .select("*")
    .order("display_name");

  if (!users?.length) return [];

  const userIds = users.map((u) => u.id);
  const pushUserIds = await fetchPushUserIds(supabase);

  const weekStart = getDateRange(getTodayInTimezone(), 7)[0];

  const { data: routines } = await supabase
    .from("routines")
    .select("id, user_id, type")
    .in("user_id", userIds)
    .eq("is_active", true);

  const routineIds = (routines ?? []).map((r) => r.id);

  const { data: weekCheckins } = routineIds.length
    ? await supabase
        .from("checkins")
        .select("id, user_id, routine_id, date, status")
        .in("user_id", userIds)
        .in("routine_id", routineIds)
        .gte("date", weekStart)
    : { data: [] };

  const { data: allDatesRows } = routineIds.length
    ? await supabase
        .from("checkins")
        .select("user_id, date")
        .in("user_id", userIds)
        .order("date", { ascending: false })
    : { data: [] };

  const checkinIds = (weekCheckins ?? []).map((c) => c.id);
  const { data: missItems } = checkinIds.length
    ? await supabase
        .from("checkin_items")
        .select("checkin_id, reason_if_not_done")
        .in("checkin_id", checkinIds)
        .eq("was_done", false)
    : { data: [] };

  const missByCheckin = new Map<string, (string | null)[]>();
  for (const item of missItems ?? []) {
    const list = missByCheckin.get(item.checkin_id) ?? [];
    list.push(item.reason_if_not_done);
    missByCheckin.set(item.checkin_id, list);
  }

  const routinesByUser = new Map<string, { id: string; type: "morning" | "evening" }[]>();
  for (const r of routines ?? []) {
    const list = routinesByUser.get(r.user_id) ?? [];
    list.push({ id: r.id, type: r.type as "morning" | "evening" });
    routinesByUser.set(r.user_id, list);
  }

  const datesByUser = new Map<string, string[]>();
  for (const row of allDatesRows ?? []) {
    const list = datesByUser.get(row.user_id) ?? [];
    if (!list.includes(row.date)) list.push(row.date);
    datesByUser.set(row.user_id, list);
  }

  return (users as User[]).map((user) => {
    const userRoutines = routinesByUser.get(user.id) ?? [];
    const userRoutineIds = new Set(userRoutines.map((r) => r.id));
    const userWeekCheckins = (weekCheckins ?? []).filter(
      (c) => c.user_id === user.id && userRoutineIds.has(c.routine_id)
    );

    const today = getTodayInTimezone(user.timezone);
    const todayCheckins = userWeekCheckins.filter((c) => c.date === today);

    const userMissReasons: (string | null)[] = [];
    for (const c of userWeekCheckins) {
      const reasons = missByCheckin.get(c.id) ?? [];
      userMissReasons.push(...reasons);
    }

    return buildMemberStats({
      user,
      routines: userRoutines,
      weekCheckins: userWeekCheckins,
      todayCheckins,
      missReasons: userMissReasons,
      hasPush: pushUserIds.has(user.id),
      allCheckinDates: datesByUser.get(user.id) ?? [],
    });
  });
}

export async function fetchAdminDashboard(
  supabase: SupabaseClient
): Promise<AdminDashboardData> {
  const members = await fetchAllMemberStats(supabase);

  const tierCounts: AdminDashboardData["tierCounts"] = {
    strong: 0,
    steady: 0,
    slipping: 0,
    at_risk: 0,
    inactive: 0,
  };
  for (const m of members) {
    tierCounts[m.tier] += 1;
  }

  const activeMembers = members.filter((m) => m.onboardingComplete);
  const onboardedCount = activeMembers.length;
  const totalMembers = members.length;

  let todayMorningDone = 0;
  let todayEveningDone = 0;
  let todayNotLogged = 0;

  for (const m of activeMembers) {
    if (m.todayMorning !== "none") todayMorningDone += 1;
    if (m.todayEvening !== "none") todayEveningDone += 1;
    if (m.todayMorning === "none" || m.todayEvening === "none") {
      todayNotLogged += 1;
    }
  }

  const totalLogged = members.reduce((s, m) => s + m.loggedCount, 0);
  const totalSlots = members.reduce((s, m) => s + m.totalSlots, 0);
  const groupLogRate7d =
    totalSlots > 0 ? Math.round((totalLogged / totalSlots) * 100) : 0;

  const reasonCounts = new Map<string, number>();
  for (const m of members) {
    for (const { reason, count } of m.topMissReasons) {
      reasonCounts.set(reason, (reasonCounts.get(reason) ?? 0) + count);
    }
  }
  const topGroupMissReasons = Array.from(reasonCounts.entries())
    .map(([reason, count]) => ({ reason, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const adminToday = getTodayInTimezone();
  const trendDates = getTrendDates(adminToday, 7);

  const userIds = members.map((m) => m.userId);
  const { data: trendCheckins } = userIds.length
    ? await supabase
        .from("checkins")
        .select("user_id, date")
        .in("user_id", userIds)
        .gte("date", trendDates[0])
        .lte("date", trendDates[trendDates.length - 1])
    : { data: [] };

  const { data: allRoutines } = userIds.length
    ? await supabase
        .from("routines")
        .select("user_id")
        .in("user_id", userIds)
        .eq("is_active", true)
    : { data: [] };

  const routineCountByUser = new Map<string, number>();
  for (const r of allRoutines ?? []) {
    routineCountByUser.set(
      r.user_id,
      (routineCountByUser.get(r.user_id) ?? 0) + 1
    );
  }

  const trendDays = trendDates.map((date) => ({
    date,
    logRate: groupDayLogRate(
      members,
      date,
      trendCheckins ?? [],
      routineCountByUser
    ),
  }));

  return {
    members,
    tierCounts,
    onboardedCount,
    totalMembers,
    todayMorningDone,
    todayEveningDone,
    todayNotLogged,
    groupLogRate7d,
    trendDays,
    topGroupMissReasons,
  };
}

export async function fetchMemberDetail(
  supabase: SupabaseClient,
  userId: string
): Promise<AdminMemberDetail | null> {
  const { data: user } = await supabase
    .from("users")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  if (!user) return null;

  const pushUserIds = await fetchPushUserIds(supabase);
  const today = getTodayInTimezone(user.timezone);
  const days = getDateRange(today, 7);

  const { data: routines } = await supabase
    .from("routines")
    .select("id, type")
    .eq("user_id", userId)
    .eq("is_active", true);

  const routineList = (routines ?? []) as { id: string; type: "morning" | "evening" }[];
  const routineIds = routineList.map((r) => r.id);

  const { data: weekCheckins } = routineIds.length
    ? await supabase
        .from("checkins")
        .select("id, routine_id, date, status")
        .eq("user_id", userId)
        .in("routine_id", routineIds)
        .gte("date", days[0])
        .lte("date", days[days.length - 1])
    : { data: [] };

  const { data: allDatesRows } = await supabase
    .from("checkins")
    .select("date")
    .eq("user_id", userId)
    .order("date", { ascending: false });

  const checkinIds = (weekCheckins ?? []).map((c) => c.id);
  const { data: missItems } = checkinIds.length
    ? await supabase
        .from("checkin_items")
        .select("checkin_id, reason_if_not_done, routine_item_id")
        .in("checkin_id", checkinIds)
        .eq("was_done", false)
    : { data: [] };

  const routineItemIds = Array.from(
    new Set((missItems ?? []).map((i) => i.routine_item_id))
  );
  const { data: routineItems } = routineItemIds.length
    ? await supabase
        .from("routine_items")
        .select("id, label")
        .in("id", routineItemIds)
    : { data: [] };
  const itemLabelById = new Map(
    (routineItems ?? []).map((i) => [i.id, i.label as string])
  );
  const checkinDateById = new Map(
    (weekCheckins ?? []).map((c) => [c.id, c.date])
  );

  const missReasons = (missItems ?? []).map((i) => i.reason_if_not_done);

  const todayCheckins = (weekCheckins ?? []).filter((c) => c.date === today);

  const stats = buildMemberStats({
    user: user as User,
    routines: routineList,
    weekCheckins: weekCheckins ?? [],
    todayCheckins,
    missReasons,
    hasPush: pushUserIds.has(userId),
    allCheckinDates: (allDatesRows ?? []).map((r) => r.date),
  });

  const { buildWeeklyReport } = await import("@/lib/weekly-stats");
  const weekReport = buildWeeklyReport({
    days,
    routines: routineList,
    checkins: weekCheckins ?? [],
    missReasons,
    today,
  });

  const recentMissReasons = (missItems ?? [])
    .filter((i) => i.reason_if_not_done?.trim())
    .map((i) => ({
      reason: i.reason_if_not_done!.trim(),
      date: checkinDateById.get(i.checkin_id) ?? "",
      itemLabel: itemLabelById.get(i.routine_item_id) ?? "Item",
    }))
    .slice(0, 10);

  const { data: reminders } = await supabase
    .from("reminder_log")
    .select("was_actioned")
    .eq("user_id", userId)
    .gte("date", days[0]);

  let reminderActionRate: number | null = null;
  if (reminders?.length) {
    const actioned = reminders.filter((r) => r.was_actioned).length;
    reminderActionRate = Math.round((actioned / reminders.length) * 100);
  }

  return {
    ...stats,
    weekReport,
    routines: routineList,
    recentMissReasons,
    reminderActionRate,
  };
}
