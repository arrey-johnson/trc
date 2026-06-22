import { NextResponse } from "next/server";
import {
  processForumNotifications,
  processRoutineReminders,
} from "@/lib/notifications/send";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function isAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;

  const auth = request.headers.get("authorization");
  return auth === `Bearer ${secret}`;
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const reminders = await processRoutineReminders();
    const forum = await processForumNotifications();

    return NextResponse.json({
      ok: true,
      reminders,
      forumNotifications: forum,
      at: new Date().toISOString(),
    });
  } catch (err) {
    console.error("Cron reminders failed:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Cron failed" },
      { status: 500 }
    );
  }
}
