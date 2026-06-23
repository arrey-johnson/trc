import Link from "next/link";
import { NotificationBell } from "@/components/NotificationBell";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ButtonLink, Card, PageShell } from "@/components/ui";
import { ROUTINE_LABELS } from "@/lib/constants";
import { formatReportDate, getTodayInTimezone } from "@/lib/dates";
import { getAuthUser, getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { RoutineType } from "@/lib/types";
import { redirect } from "next/navigation";

const ROUTINE_META: Record<
  RoutineType,
  { emoji: string; logLabel: string; doneLabel: string }
> = {
  morning: {
    emoji: "☀️",
    logLabel: "Log morning check-in",
    doneLabel: "Share morning report",
  },
  evening: {
    emoji: "🌙",
    logLabel: "Log evening check-in",
    doneLabel: "Share evening report",
  },
};

function statusLabel(status: string) {
  if (status === "complete") return "All done";
  if (status === "partial") return "Partially done";
  return "Missed";
}

export default async function HomePage() {
  const authUser = await getAuthUser();

  if (!authUser) {
    redirect("/auth/login");
  }

  const profile = await getCurrentUser();

  if (!profile?.onboarding_complete) {
    redirect("/onboarding");
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
  const { data: todayCheckins } = await supabase
    .from("checkins")
    .select("id, routine_id, status")
    .eq("user_id", profile.id)
    .eq("date", today)
    .in(
      "routine_id",
      routineIds.length ? routineIds : ["00000000-0000-0000-0000-000000000000"]
    );

  const checkinByRoutine = new Map(
    (todayCheckins ?? []).map((c) => [c.routine_id, c])
  );

  const routineTypes: RoutineType[] = ["morning", "evening"];
  const loggedCount = routineTypes.filter((type) => {
    const routine = routines?.find((r) => r.type === type);
    return routine && checkinByRoutine.has(routine.id);
  }).length;

  const { count: unreadCount } = await supabase
    .from("app_notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", profile.id)
    .is("read_at", null);

  return (
    <PageShell>
      <header className="mb-6 rounded-2xl bg-gradient-to-br from-emerald-600 to-emerald-700 p-5 text-white shadow-md">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-emerald-100">Today</p>
            <h1 className="mt-1 text-2xl font-bold">Hey, {profile.display_name}</h1>
            <p className="mt-1 text-sm text-emerald-50">{friendlyDate}</p>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <ThemeToggle variant="header" />
            <NotificationBell initialUnread={unreadCount ?? 0} />
            <Link
              href="/settings"
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-white transition hover:bg-white/25"
              aria-label="Settings"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            </Link>
          </div>
        </div>

        <div className="mt-4">
          <div className="mb-1 flex items-center justify-between text-xs font-medium text-emerald-100">
            <span>Today&apos;s progress</span>
            <span>
              {loggedCount}/{routineTypes.length} logged
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-emerald-800/40">
            <div
              className="h-full rounded-full bg-white transition-all"
              style={{
                width: `${(loggedCount / routineTypes.length) * 100}%`,
              }}
            />
          </div>
        </div>
      </header>

      <div className="space-y-4">
        {routineTypes.map((type) => {
          const routine = routines?.find((r) => r.type === type);
          const checkin = routine ? checkinByRoutine.get(routine.id) : null;
          const label = ROUTINE_LABELS[type];
          const meta = ROUTINE_META[type];
          const isDone = Boolean(checkin);

          return (
            <Card key={type} className="space-y-4 p-5">
              <div className="flex items-start gap-3">
                <span
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[var(--surface)] text-2xl"
                  aria-hidden
                >
                  {meta.emoji}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-lg font-semibold text-[var(--foreground)]">
                      {label}
                    </h2>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        isDone
                          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200"
                          : "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200"
                      }`}
                    >
                      {isDone ? statusLabel(checkin!.status) : "Pending"}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-[var(--muted)]">
                    {isDone
                      ? "Submitted — tap below to share with your group"
                      : "Tap each item, then share your report to WhatsApp"}
                  </p>
                </div>
              </div>

              {isDone ? (
                <ButtonLink
                  href={`/share/${checkin!.id}`}
                  className="w-full"
                  variant="secondary"
                >
                  {meta.doneLabel}
                </ButtonLink>
              ) : (
                <ButtonLink href={`/checkin/${type}`} className="w-full">
                  {meta.logLabel}
                </ButtonLink>
              )}
            </Card>
          );
        })}
      </div>

      {profile.whatsapp_group_role === "admin" && (
        <div className="mt-6">
          <ButtonLink href="/admin" variant="secondary" className="w-full">
            Open admin dashboard
          </ButtonLink>
        </div>
      )}
    </PageShell>
  );
}
