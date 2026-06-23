import { NextResponse } from "next/server";
import {
  processForumNotifications,
  processRoutineReminders,
} from "@/lib/notifications/send";
import { isPushConfigured } from "@/lib/push/server";
import { isAdminClientConfigured } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function isAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;

  const auth = request.headers.get("authorization");
  return auth === `Bearer ${secret}`;
}

function getPushConfigStatus() {
  return {
    vapidPublic: Boolean(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY),
    vapidPrivate: Boolean(process.env.VAPID_PRIVATE_KEY),
    vapidSubject: Boolean(process.env.VAPID_SUBJECT),
    pushReady: isPushConfigured(),
    serviceRole: isAdminClientConfigured(),
    cronSecret: Boolean(process.env.CRON_SECRET),
  };
}

async function runReminders() {
  if (!isAdminClientConfigured()) {
    return NextResponse.json(
      {
        error: "SUPABASE_SERVICE_ROLE_KEY is not configured.",
        config: getPushConfigStatus(),
      },
      { status: 500 }
    );
  }

  const reminders = await processRoutineReminders();
  const forum = await processForumNotifications();

  return NextResponse.json({
    ok: true,
    reminders,
    forumNotifications: forum,
    config: getPushConfigStatus(),
    at: new Date().toISOString(),
  });
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    return await runReminders();
  } catch (err) {
    console.error("Cron reminders failed:", err);
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : "Cron failed",
        config: getPushConfigStatus(),
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    return await runReminders();
  } catch (err) {
    console.error("Cron reminders failed:", err);
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : "Cron failed",
        config: getPushConfigStatus(),
      },
      { status: 500 }
    );
  }
}
