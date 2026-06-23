import { ROUTINE_LABELS } from "@/lib/constants";
import { getTodayInTimezone } from "@/lib/dates";
import type { NotificationType, PushPayload } from "@/lib/notifications/types";
import { sendWebPush, isPushConfigured } from "@/lib/push/server";
import { createAdminClient, isAdminClientConfigured } from "@/lib/supabase/admin";
import type { RoutineType } from "@/lib/types";

// Hobby plan: Vercel allows one cron run per day. We batch-send all reminders
// whose local time has passed and haven't been sent yet (per user timezone).
const ESCALATION_HOURS = 2;

function normalizeTime(t: string): string {
  return t.slice(0, 5);
}

function timeToMinutes(t: string): number {
  const [h, m] = normalizeTime(t).split(":").map(Number);
  return h * 60 + m;
}

export function getLocalHHMM(timezone: string): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date());

  const hour = parts.find((p) => p.type === "hour")?.value ?? "00";
  const minute = parts.find((p) => p.type === "minute")?.value ?? "00";
  return `${hour}:${minute}`;
}

/** True when the user's local clock is at or past their reminder time today. */
export function isReminderPastDue(
  reminderTime: string,
  currentHHMM: string
): boolean {
  const due = timeToMinutes(reminderTime);
  const now = timeToMinutes(currentHHMM);
  return now >= due;
}

function buildRoutineBody(labels: string[]): string {
  if (labels.length === 0) return "Tap to log your check-in.";
  const preview = labels
    .slice(0, 4)
    .map((label) => `• ${label}`)
    .join("\n");
  const extra =
    labels.length > 4 ? `\n+ ${labels.length - 4} more` : "";
  return `${preview}${extra}`;
}

async function deliverToUser(
  userId: string,
  type: NotificationType,
  payload: PushPayload
): Promise<{ pushSent: number; pushFailed: number }> {
  const admin = createAdminClient();

  await admin.from("app_notifications").insert({
    user_id: userId,
    type,
    title: payload.title,
    body: payload.body,
    url: payload.url ?? null,
  });

  if (!isPushConfigured()) {
    return { pushSent: 0, pushFailed: 0 };
  }

  const { data: subs } = await admin
    .from("push_subscriptions")
    .select("id, subscription_json, endpoint")
    .eq("user_id", userId);

  let pushSent = 0;
  let pushFailed = 0;

  for (const sub of subs ?? []) {
    const result = await sendWebPush(sub.subscription_json, payload);
    if (result.ok) {
      pushSent++;
    } else {
      pushFailed++;
      if (result.gone && sub.endpoint) {
        await admin
          .from("push_subscriptions")
          .delete()
          .eq("user_id", userId)
          .eq("endpoint", sub.endpoint);
      }
    }
  }

  return { pushSent, pushFailed };
}

async function getRoutineItemLabels(
  userId: string,
  routineType: RoutineType
): Promise<string[]> {
  const admin = createAdminClient();

  const { data: routine } = await admin
    .from("routines")
    .select("id")
    .eq("user_id", userId)
    .eq("type", routineType)
    .eq("is_active", true)
    .maybeSingle();

  if (!routine) return [];

  const { data: items } = await admin
    .from("routine_items")
    .select("label")
    .eq("routine_id", routine.id)
    .eq("is_active", true)
    .order("sort_order");

  return (items ?? []).map((i) => i.label);
}

async function hasCheckinToday(
  userId: string,
  routineType: RoutineType,
  date: string
): Promise<boolean> {
  const admin = createAdminClient();

  const { data: routine } = await admin
    .from("routines")
    .select("id")
    .eq("user_id", userId)
    .eq("type", routineType)
    .maybeSingle();

  if (!routine) return true;

  const { data: checkin } = await admin
    .from("checkins")
    .select("id")
    .eq("user_id", userId)
    .eq("routine_id", routine.id)
    .eq("date", date)
    .maybeSingle();

  return Boolean(checkin);
}

async function reminderAlreadySent(
  userId: string,
  date: string,
  reminderType: "first" | "escalation",
  routineType: RoutineType
): Promise<boolean> {
  const admin = createAdminClient();

  const { data } = await admin
    .from("reminder_log")
    .select("id")
    .eq("user_id", userId)
    .eq("date", date)
    .eq("reminder_type", reminderType)
    .eq("routine_type", routineType)
    .maybeSingle();

  return Boolean(data);
}

async function logReminder(
  userId: string,
  date: string,
  reminderType: "first" | "escalation",
  routineType: RoutineType
) {
  const admin = createAdminClient();
  await admin.from("reminder_log").insert({
    user_id: userId,
    date,
    reminder_type: reminderType,
    routine_type: routineType,
  });
}

async function shouldSendEscalation(
  userId: string,
  date: string,
  routineType: RoutineType
): Promise<boolean> {
  const admin = createAdminClient();

  const { data: first } = await admin
    .from("reminder_log")
    .select("sent_at")
    .eq("user_id", userId)
    .eq("date", date)
    .eq("reminder_type", "first")
    .eq("routine_type", routineType)
    .maybeSingle();

  if (!first) return false;

  const sentAt = new Date(first.sent_at).getTime();
  const hoursSince = (Date.now() - sentAt) / (1000 * 60 * 60);
  return hoursSince >= ESCALATION_HOURS;
}

export async function processRoutineReminders(): Promise<{
  firstSent: number;
  escalationSent: number;
}> {
  const admin = createAdminClient();

  const { data: users } = await admin
    .from("users")
    .select(
      "id, timezone, morning_reminder_time, evening_reminder_time, onboarding_complete"
    )
    .eq("onboarding_complete", true)
    .neq("whatsapp_group_role", "admin");

  let firstSent = 0;
  let escalationSent = 0;

  for (const user of users ?? []) {
    const today = getTodayInTimezone(user.timezone);
    const nowLocal = getLocalHHMM(user.timezone);

    const routines: Array<{
      type: RoutineType;
      reminderTime: string;
    }> = [
      { type: "morning", reminderTime: user.morning_reminder_time },
      { type: "evening", reminderTime: user.evening_reminder_time },
    ];

    for (const { type, reminderTime } of routines) {
      if (await hasCheckinToday(user.id, type, today)) continue;

      if (
        isReminderPastDue(reminderTime, nowLocal) &&
        !(await reminderAlreadySent(user.id, today, "first", type))
      ) {
        const labels = await getRoutineItemLabels(user.id, type);
        const label = ROUTINE_LABELS[type];
        await deliverToUser(user.id, `${type}_reminder`, {
          title: `${label} check-in`,
          body: buildRoutineBody(labels),
          url: `/checkin/${type}`,
          tag: `${type}-reminder-${today}`,
        });
        await logReminder(user.id, today, "first", type);
        firstSent++;
        continue;
      }

      if (
        !(await reminderAlreadySent(user.id, today, "escalation", type)) &&
        (await shouldSendEscalation(user.id, today, type))
      ) {
        const label = ROUTINE_LABELS[type];
        await deliverToUser(user.id, "escalation", {
          title: `Still need your ${label.toLowerCase()}?`,
          body: "You haven't logged today's check-in yet. Tap to finish in under a minute.",
          url: `/checkin/${type}`,
          tag: `${type}-escalation-${today}`,
        });
        await logReminder(user.id, today, "escalation", type);
        escalationSent++;
      }
    }
  }

  return { firstSent, escalationSent };
}

export async function processForumNotifications(): Promise<number> {
  if (!isAdminClientConfigured()) {
    return 0;
  }

  const admin = createAdminClient();

  const { data: posts } = await admin
    .from("forum_posts")
    .select("id, body")
    .is("parent_id", null)
    .is("notified_at", null);

  if (!posts?.length) return 0;

  const { data: users } = await admin
    .from("users")
    .select("id")
    .eq("onboarding_complete", true);

  let sent = 0;

  for (const post of posts) {
    const preview =
      post.body.length > 120 ? `${post.body.slice(0, 117)}...` : post.body;

    for (const user of users ?? []) {
      await deliverToUser(user.id, "forum_post", {
        title: `New post from the circle`,
        body: preview,
        url: `/forum/${post.id}`,
        tag: `forum-${post.id}`,
      });
      sent++;
    }

    await admin
      .from("forum_posts")
      .update({ notified_at: new Date().toISOString() })
      .eq("id", post.id);
  }

  return sent;
}

export async function markRemindersActioned(
  userId: string,
  routineType: RoutineType,
  date: string
) {
  const admin = createAdminClient();
  await admin
    .from("reminder_log")
    .update({ was_actioned: true })
    .eq("user_id", userId)
    .eq("date", date)
    .eq("routine_type", routineType);
}
