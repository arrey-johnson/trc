"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser, requireAdmin } from "@/lib/auth";
import { sendTestNotificationToUser } from "@/lib/notifications/send";
import { createAdminClient, isAdminClientConfigured } from "@/lib/supabase/admin";

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

  const admin = createAdminClient();
  const { data: members } = await admin
    .from("users")
    .select("id")
    .eq("onboarding_complete", true)
    .eq("whatsapp_group_role", "member");

  let sent = 0;
  let failed = 0;
  let skipped = 0;

  for (const member of members ?? []) {
    const result = await sendTestNotificationToUser(member.id);
    if (result.error) {
      if (result.subscriptionCount === 0) {
        skipped++;
      } else {
        failed++;
      }
      continue;
    }
    sent += result.pushSent;
    failed += result.pushFailed;
  }

  revalidatePath("/notifications");
  return {
    error: null,
    members: members?.length ?? 0,
    devicesNotified: sent,
    failed,
    skipped,
  };
}
