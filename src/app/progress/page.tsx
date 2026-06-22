import { redirect } from "next/navigation";
import { ButtonLink, Card, PageShell } from "@/components/ui";
import { ROUTINE_LABELS } from "@/lib/constants";
import { getTodayInTimezone } from "@/lib/dates";
import { getAuthUser, getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatWeekRange, getDateRange, weekdayShort } from "@/lib/week";
import {
  buildWeeklyReport,
  dayStatusEmoji,
  dayStatusLabel,
} from "@/lib/weekly-stats";

const TONE_STYLES = {
  celebrate: "from-emerald-500 to-emerald-700",
  solid: "from-teal-500 to-emerald-600",
  grow: "from-amber-500 to-orange-500",
  fresh: "from-sky-500 to-indigo-500",
} as const;

export default async function ProgressPage() {
  const authUser = await getAuthUser();
  if (!authUser) redirect("/auth/login");

  const profile = await getCurrentUser();
  if (!profile?.onboarding_complete) redirect("/onboarding");

  const timezone = profile.timezone ?? "Africa/Douala";
  const today = getTodayInTimezone(timezone);
  const days = getDateRange(today, 7);

  const supabase = createClient();
  const { data: routines } = await supabase
    .from("routines")
    .select("id, type")
    .eq("user_id", profile.id)
    .eq("is_active", true);

  const routineList = routines ?? [];
  const routineIds = routineList.map((r) => r.id);

  const { data: checkins } = routineIds.length
    ? await supabase
        .from("checkins")
        .select("id, routine_id, date, status")
        .eq("user_id", profile.id)
        .in("routine_id", routineIds)
        .gte("date", days[0])
        .lte("date", days[days.length - 1])
    : { data: [] };

  const checkinIds = (checkins ?? []).map((c) => c.id);
  const { data: missItems } = checkinIds.length
    ? await supabase
        .from("checkin_items")
        .select("reason_if_not_done")
        .in("checkin_id", checkinIds)
        .eq("was_done", false)
    : { data: [] };

  const report = buildWeeklyReport({
    days,
    routines: routineList,
    checkins: checkins ?? [],
    missReasons: (missItems ?? []).map((i) => i.reason_if_not_done),
    today,
  });

  return (
    <PageShell>
      <header
        className={`mb-6 rounded-2xl bg-gradient-to-br ${TONE_STYLES[report.tone]} p-5 text-white shadow-md`}
      >
        <p className="text-sm font-medium text-white/80">Your week</p>
        <h1 className="mt-1 text-2xl font-bold">Weekly progress</h1>
        <p className="mt-1 text-sm text-white/90">
          {formatWeekRange(days[0], days[days.length - 1], timezone)}
        </p>

        <div className="mt-4 grid grid-cols-3 gap-2 text-center">
          <div className="rounded-xl bg-white/15 px-2 py-2">
            <p className="text-lg font-bold">{report.logRatePercent}%</p>
            <p className="text-[10px] uppercase tracking-wide text-white/80">
              Logged
            </p>
          </div>
          <div className="rounded-xl bg-white/15 px-2 py-2">
            <p className="text-lg font-bold">
              {report.loggedCount}/{report.totalSlots}
            </p>
            <p className="text-[10px] uppercase tracking-wide text-white/80">
              Check-ins
            </p>
          </div>
          <div className="rounded-xl bg-white/15 px-2 py-2">
            <p className="text-lg font-bold">{report.completeCount}</p>
            <p className="text-[10px] uppercase tracking-wide text-white/80">
              Full wins
            </p>
          </div>
        </div>

        <p className="mt-4 text-sm font-medium leading-snug">{report.message}</p>
      </header>

      <div className="space-y-4">
        {report.routines.map((routine) => (
          <Card key={routine.routineId} className="space-y-4 p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-stone-900">
                  {ROUTINE_LABELS[routine.routineType]}
                </h2>
                <p className="mt-1 text-sm text-stone-600">
                  {routine.loggedCount}/7 days logged · {routine.completeCount}{" "}
                  complete · 🔥 {routine.streak} day streak
                </p>
              </div>
              <ButtonLink
                href={`/checkin/${routine.routineType}`}
                className="w-auto shrink-0 px-3 text-sm"
              >
                Log
              </ButtonLink>
            </div>

            <div className="grid grid-cols-7 gap-1.5">
              {routine.days.map((day) => (
                <div key={day.date} className="flex flex-col items-center gap-1">
                  <span className="text-[10px] font-medium text-stone-500">
                    {weekdayShort(day.date, timezone)}
                  </span>
                  <div
                    title={`${day.date}: ${dayStatusLabel(day.status)}`}
                    className={`flex h-11 w-full items-center justify-center rounded-xl text-base ${
                      day.status === "complete"
                        ? "bg-emerald-100"
                        : day.status === "partial"
                          ? "bg-amber-100"
                          : day.status === "missed"
                            ? "bg-red-100"
                            : "bg-stone-100 text-stone-400"
                    }`}
                  >
                    {dayStatusEmoji(day.status)}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>

      {report.topMissReasons.length > 0 && (
        <Card className="mt-4 space-y-3 p-5">
          <h2 className="font-semibold text-stone-900">
            What held you back this week
          </h2>
          <ul className="space-y-2">
            {report.topMissReasons.map((item) => (
              <li
                key={item.reason}
                className="flex items-center justify-between rounded-xl bg-stone-50 px-3 py-2 text-sm"
              >
                <span className="text-stone-700">{item.reason}</span>
                <span className="font-medium text-stone-500">×{item.count}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <div className="mt-4">
        <ButtonLink href="/" variant="secondary" className="w-full">
          Back to today
        </ButtonLink>
      </div>
    </PageShell>
  );
}
