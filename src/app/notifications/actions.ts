"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser, requireAdmin } from "@/lib/auth";
import {
  broadcastToOnboardedMembers,
  sendMotivationalQuoteToMembers,
  sendTestNotificationToUser,
} from "@/lib/notifications/send";
import { isAdminClientConfigured } from "@/lib/supabase/admin";

export async function sendTestNotification() {
  const profile = await getCurrentUser();
  if (!profile?.onboarding_complete) {
    return { error: "Not allowed." };
  }

  const result = await sendTestNotificationToUser(profile.id);
  if (result.error) {
    return { error: result.error };
  }

  revalidatePath("/notifications");
  return {
    error: null,
    pushSent: result.pushSent,
    pushFailed: result.pushFailed,
  };
}

export async function sendTestNotificationToAllMembers() {
  await requireAdmin();

  if (!isAdminClientConfigured()) {
    return { error: "Push is not configured on this server." };
  }

  const result = await broadcastToOnboardedMembers({
    title: "The Reset Circle",
    body: "Test notification — you're all set to receive reminders.",
    url: "/settings",
    tag: "test-notification",
  });

  if (result.error) {
    return { error: result.error };
  }

  revalidatePath("/notifications");
  return {
    error: null,
    members: result.members,
    devicesNotified: result.devicesNotified,
    failed: result.pushFailed,
    skipped: result.skippedNoPush,
  };
}

export async function sendMotivationalQuote(formData: FormData) {
  await requireAdmin();

  const quote = String(formData.get("quote") ?? "");
  const title = String(formData.get("title") ?? "");

  const result = await sendMotivationalQuoteToMembers(quote, title);
  if (result.error) {
    return { error: result.error };
  }

  revalidatePath("/notifications");
  revalidatePath("/admin/motivate");

  return {
    error: null,
    members: result.members,
    inboxDelivered: result.inboxDelivered,
    devicesNotified: result.devicesNotified,
    skippedNoPush: result.skippedNoPush,
    pushFailed: result.pushFailed,
  };
}
