import { formatTimeForDisplay, getTodayInTimezone, isEveningInTimezone } from "@/lib/dates";
import { createClient } from "@/lib/supabase/server";
import type { CheckinPageData } from "@/lib/checkin/types";
import type { RoutineType } from "@/lib/types";

export type { CheckinPageData } from "@/lib/checkin/types";

export async function loadCheckinPageData(
  userId: string,
  routineType: RoutineType,
  timezone: string,
  eveningReminderTime: string
): Promise<CheckinPageData> {
  const supabase = createClient();
  const today = getTodayInTimezone(timezone);
  const eveningTime = eveningReminderTime ?? "21:00";
  let hasNonNegotiables = false;

  if (routineType === "evening") {
    if (!isEveningInTimezone(timezone, eveningTime)) {
      return {
        today,
        timezone,
        eveningReminderTime: eveningTime,
        routineId: null,
        items: [],
        existingCheckinId: null,
        eveningBlocked: true,
        eveningUnlockLabel: formatTimeForDisplay(eveningTime),
        hasNonNegotiables: false,
        error: null,
      };
    }

    const { count } = await supabase
      .from("daily_non_negotiables")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("date", today);

    hasNonNegotiables = (count ?? 0) > 0;
  }

  const { data: routine, error: routineError } = await supabase
    .from("routines")
    .select("id")
    .eq("user_id", userId)
    .eq("type", routineType)
    .eq("is_active", true)
    .maybeSingle();

  if (routineError) {
    return emptyCheckinData(today, timezone, eveningTime, routineError.message);
  }

  if (!routine) {
    return {
      ...emptyCheckinData(today, timezone, eveningTime, null),
      error: "Routine not found. Complete onboarding first.",
    };
  }

  const [existingResult, itemsResult] = await Promise.all([
    supabase
      .from("checkins")
      .select("id")
      .eq("user_id", userId)
      .eq("routine_id", routine.id)
      .eq("date", today)
      .maybeSingle(),
    supabase
      .from("routine_items")
      .select("id, label")
      .eq("routine_id", routine.id)
      .eq("is_active", true)
      .order("sort_order"),
  ]);

  if (existingResult.error) {
    return emptyCheckinData(today, timezone, eveningTime, existingResult.error.message);
  }

  if (itemsResult.error) {
    return emptyCheckinData(today, timezone, eveningTime, itemsResult.error.message);
  }

  return {
    today,
    timezone,
    eveningReminderTime: eveningTime,
    routineId: routine.id,
    items: itemsResult.data ?? [],
    existingCheckinId: existingResult.data?.id ?? null,
    eveningBlocked: false,
    eveningUnlockLabel: "",
    hasNonNegotiables,
    error: null,
  };
}

function emptyCheckinData(
  today: string,
  timezone: string,
  eveningReminderTime: string,
  error: string | null
): CheckinPageData {
  return {
    today,
    timezone,
    eveningReminderTime,
    routineId: null,
    items: [],
    existingCheckinId: null,
    eveningBlocked: false,
    eveningUnlockLabel: "",
    hasNonNegotiables: false,
    error,
  };
}
