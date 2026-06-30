import { HomeView } from "@/components/HomeView";
import {
  formatReportDate,
  formatTimeForDisplay,
  getTodayInTimezone,
  isEveningInTimezone,
} from "@/lib/dates";
import { requireMember } from "@/lib/auth";
import { getAvatarPublicUrl } from "@/lib/profile/avatar";
import { createClient } from "@/lib/supabase/server";
import type { RoutineType } from "@/lib/types";
import { redirect } from "next/navigation";

export default async function HomePage() {
  const profile = await requireMember();

  if (profile.whatsapp_group_role === "admin") {
    redirect("/admin");
  }

  const supabase = createClient();
  const today = getTodayInTimezone(profile.timezone);
  const friendlyDate = formatReportDate(today, profile.timezone);

  const { data: routines } = await supabase
    .from("routines")
    .select("id, type")
    .eq("user_id", profile.id)
    .eq("is_active", true);

  const routineIds = (routines ?? []).map((r) => r.id);
  const emptyRoutineId = "00000000-0000-0000-0000-000000000000";

  const [{ data: todayCheckins }, { data: nonNegotiables }, { count: unreadCount }] =
    await Promise.all([
      supabase
        .from("checkins")
        .select("id, routine_id, status")
        .eq("user_id", profile.id)
        .eq("date", today)
        .in("routine_id", routineIds.length ? routineIds : [emptyRoutineId]),
      supabase
        .from("daily_non_negotiables")
        .select("*")
        .eq("user_id", profile.id)
        .eq("date", today)
        .order("sort_order"),
      supabase
        .from("app_notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", profile.id)
        .is("read_at", null),
    ]);

  const checkinByRoutine = new Map(
    (todayCheckins ?? []).map((c) => [c.routine_id, c])
  );

  const routineTypes: RoutineType[] = ["morning", "evening"];
  const loggedCount = routineTypes.filter((type) => {
    const routine = routines?.find((r) => r.type === type);
    return routine && checkinByRoutine.has(routine.id);
  }).length;

  const nnItems = nonNegotiables ?? [];
  const isEvening = isEveningInTimezone(
    profile.timezone,
    profile.evening_reminder_time
  );
  const eveningUnlockLabel = formatTimeForDisplay(profile.evening_reminder_time);

  const routineCards = routineTypes.map((type) => {
    const routine = routines?.find((r) => r.type === type);
    const checkin = routine ? checkinByRoutine.get(routine.id) : null;
    return {
      type,
      checkin: checkin
        ? { id: checkin.id, status: checkin.status }
        : null,
    };
  });

  return (
    <HomeView
      displayName={profile.display_name}
      avatarUrl={getAvatarPublicUrl(profile.avatar_url)}
      friendlyDate={friendlyDate}
      today={today}
      timezone={profile.timezone}
      userId={profile.id}
      nnItems={nnItems}
      loggedCount={loggedCount}
      isEvening={isEvening}
      eveningUnlockLabel={eveningUnlockLabel}
      unreadCount={unreadCount ?? 0}
      routines={routineCards}
    />
  );
}
