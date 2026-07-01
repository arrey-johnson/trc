import {
  getTodayInTimezone,
  isEveningUnlockedInTimezone,
  eveningUnlockLabel,
} from "@/lib/dates";
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
    if (!isEveningUnlockedInTimezone(timezone)) {
      return emptyCheckinData(today, timezone, eveningTime, {
        eveningBlocked: true,
        eveningUnlockLabel: eveningUnlockLabel(),
      });
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
    return emptyCheckinData(today, timezone, eveningTime, {
      error: routineError.message,
    });
  }

  if (!routine) {
    return emptyCheckinData(today, timezone, eveningTime, {
      error: "Routine not found. Complete onboarding first.",
    });
  }

  const [existingResult, itemsResult] = await Promise.all([
    supabase
      .from("checkins")
      .select("id, status")
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
    return emptyCheckinData(today, timezone, eveningTime, {
      error: existingResult.error.message,
    });
  }

  if (itemsResult.error) {
    return emptyCheckinData(today, timezone, eveningTime, {
      error: itemsResult.error.message,
    });
  }

  const existing = existingResult.data;
  let existingCheckinId: string | null = null;
  let draftCheckinId: string | null = null;
  const savedAnswers: CheckinPageData["savedAnswers"] = {};

  if (existing?.status === "draft") {
    draftCheckinId = existing.id;
    const { data: savedItems } = await supabase
      .from("checkin_items")
      .select("routine_item_id, was_done, reason_if_not_done")
      .eq("checkin_id", existing.id);

    for (const row of savedItems ?? []) {
      savedAnswers[row.routine_item_id] = {
        wasDone: row.was_done,
        reasonIfNotDone: row.reason_if_not_done ?? "",
      };
    }
  } else if (existing) {
    existingCheckinId = existing.id;
  }

  return {
    today,
    timezone,
    eveningReminderTime: eveningTime,
    routineId: routine.id,
    items: itemsResult.data ?? [],
    existingCheckinId,
    draftCheckinId,
    savedAnswers,
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
  extra: Partial<CheckinPageData> = {}
): CheckinPageData {
  return {
    today,
    timezone,
    eveningReminderTime,
    routineId: null,
    items: [],
    existingCheckinId: null,
    draftCheckinId: null,
    savedAnswers: {},
    eveningBlocked: false,
    eveningUnlockLabel: "",
    hasNonNegotiables: false,
    error: null,
    ...extra,
  };
}
