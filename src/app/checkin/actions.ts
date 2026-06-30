"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { getTodayInTimezone, isEveningInTimezone } from "@/lib/dates";
import { friendlyDbError } from "@/lib/db-errors";
import { deriveCheckinStatus } from "@/lib/streak";
import { createClient } from "@/lib/supabase/server";
import type { RoutineType } from "@/lib/types";

interface CheckinAnswer {
  routineItemId: string;
  wasDone: boolean;
  reasonIfNotDone: string;
}

interface NonNegotiableReview {
  completedAll: boolean;
  reflection: string;
}

export async function submitRoutineCheckin(params: {
  routineType: RoutineType;
  routineId: string;
  date: string;
  items: CheckinAnswer[];
  nonNegotiableReview?: NonNegotiableReview | null;
}) {
  const profile = await getCurrentUser();
  if (!profile) {
    return { error: "Not signed in.", checkinId: null };
  }

  const today = getTodayInTimezone(profile.timezone);
  if (params.date !== today) {
    return { error: "Check-in date has expired. Refresh and try again.", checkinId: null };
  }

  if (params.routineType === "evening") {
    if (!isEveningInTimezone(profile.timezone, profile.evening_reminder_time)) {
      return {
        error: "Evening check-in unlocks at your evening reminder time.",
        checkinId: null,
      };
    }
  }

  if (!params.items.length) {
    return { error: "No routine items to submit.", checkinId: null };
  }

  const answers = params.items.map((i) => ({
    wasDone: i.wasDone,
    reason: i.reasonIfNotDone,
  }));

  if (
    !answers.every(
      (a) =>
        a.wasDone === true || (a.wasDone === false && a.reason.trim().length > 0)
    )
  ) {
    return { error: "Answer every item before submitting.", checkinId: null };
  }

  const supabase = createClient();

  if (params.routineType === "evening" && params.nonNegotiableReview) {
    const review = params.nonNegotiableReview;
    if (!review.completedAll && !review.reflection.trim()) {
      return {
        error: "Please share what got in the way and how you can improve.",
        checkinId: null,
      };
    }

    const { error: reviewError } = await supabase
      .from("daily_non_negotiable_reviews")
      .upsert(
        {
          user_id: profile.id,
          date: today,
          completed_all: review.completedAll,
          reflection: review.completedAll ? null : review.reflection.trim(),
        },
        { onConflict: "user_id,date" }
      );

    if (reviewError) {
      return {
        error: friendlyDbError(reviewError.message, reviewError.code),
        checkinId: null,
      };
    }
  }

  const status = deriveCheckinStatus(answers);

  const { data: checkin, error: checkinError } = await supabase
    .from("checkins")
    .insert({
      user_id: profile.id,
      routine_id: params.routineId,
      date: params.date,
      status,
    })
    .select("id")
    .single();

  if (checkinError || !checkin) {
    if (checkinError?.code === "23505") {
      return { error: "You already submitted today's check-in.", checkinId: null };
    }
    return {
      error: friendlyDbError(
        checkinError?.message ?? "Failed to save check-in.",
        checkinError?.code
      ),
      checkinId: null,
    };
  }

  const { error: itemsError } = await supabase.from("checkin_items").insert(
    params.items.map((item) => ({
      checkin_id: checkin.id,
      routine_item_id: item.routineItemId,
      was_done: item.wasDone,
      reason_if_not_done: item.wasDone ? null : item.reasonIfNotDone.trim(),
    }))
  );

  if (itemsError) {
    return {
      error: friendlyDbError(itemsError.message, itemsError.code),
      checkinId: null,
    };
  }

  await supabase
    .from("reminder_log")
    .update({ was_actioned: true })
    .eq("user_id", profile.id)
    .eq("date", params.date)
    .eq("routine_type", params.routineType);

  revalidatePath("/");
  revalidatePath(`/checkin/${params.routineType}`);

  return { error: null, checkinId: checkin.id };
}
