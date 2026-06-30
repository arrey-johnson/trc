"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { getTodayInTimezone } from "@/lib/dates";
import { friendlyDbError } from "@/lib/db-errors";
import { createClient } from "@/lib/supabase/server";

async function getProfileContext() {
  const profile = await getCurrentUser();
  if (!profile) return null;
  return { profile, today: getTodayInTimezone(profile.timezone) };
}

export async function addDailyNonNegotiable(label: string, targetTime: string) {
  const ctx = await getProfileContext();
  if (!ctx) return { error: "Not signed in." };

  const trimmed = label.trim();
  if (!trimmed) return { error: "Task label is required." };
  if (!targetTime) return { error: "Target time is required." };

  const supabase = createClient();
  const { data: existing } = await supabase
    .from("daily_non_negotiables")
    .select("sort_order")
    .eq("user_id", ctx.profile.id)
    .eq("date", ctx.today)
    .order("sort_order", { ascending: false })
    .limit(1);

  const nextOrder = (existing?.[0]?.sort_order ?? -1) + 1;

  const { error } = await supabase.from("daily_non_negotiables").insert({
    user_id: ctx.profile.id,
    date: ctx.today,
    label: trimmed,
    target_time: targetTime,
    sort_order: nextOrder,
  });

  if (error) {
    return { error: friendlyDbError(error.message, error.code) };
  }

  revalidatePath("/");
  return { error: null };
}

export async function toggleDailyNonNegotiable(
  id: string,
  isCompleted: boolean
) {
  const ctx = await getProfileContext();
  if (!ctx) return { error: "Not signed in." };

  const supabase = createClient();
  const { error } = await supabase
    .from("daily_non_negotiables")
    .update({
      is_completed: isCompleted,
      completed_at: isCompleted ? new Date().toISOString() : null,
    })
    .eq("id", id)
    .eq("user_id", ctx.profile.id)
    .eq("date", ctx.today);

  if (error) {
    return { error: friendlyDbError(error.message, error.code) };
  }

  revalidatePath("/");
  return { error: null };
}

export async function updateDailyNonNegotiable(
  id: string,
  label: string,
  targetTime: string
) {
  const ctx = await getProfileContext();
  if (!ctx) return { error: "Not signed in." };

  const trimmed = label.trim();
  if (!trimmed) return { error: "Task label is required." };
  if (!targetTime) return { error: "Target time is required." };

  const supabase = createClient();
  const { data, error } = await supabase
    .from("daily_non_negotiables")
    .update({ label: trimmed, target_time: targetTime })
    .eq("id", id)
    .eq("user_id", ctx.profile.id)
    .eq("date", ctx.today)
    .select("id")
    .maybeSingle();

  if (error) {
    return { error: friendlyDbError(error.message, error.code) };
  }

  if (!data) {
    return { error: "Could not update this item. Refresh and try again." };
  }

  revalidatePath("/");
  return { error: null };
}

export async function deleteDailyNonNegotiable(id: string) {
  const ctx = await getProfileContext();
  if (!ctx) return { error: "Not signed in." };

  const supabase = createClient();
  const { error } = await supabase
    .from("daily_non_negotiables")
    .delete()
    .eq("id", id)
    .eq("user_id", ctx.profile.id)
    .eq("date", ctx.today);

  if (error) {
    return { error: friendlyDbError(error.message, error.code) };
  }

  revalidatePath("/");
  return { error: null };
}
