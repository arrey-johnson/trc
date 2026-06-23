import Link from "next/link";
import { notFound } from "next/navigation";
import { CommitmentBadge } from "@/components/admin/CommitmentBadge";
import { ButtonLink, Card } from "@/components/ui";
import { requireAdmin } from "@/lib/auth";
import { fetchMemberDetail } from "@/lib/admin/data";
import { whatsappUrl } from "@/lib/admin/commitment";
import {
  dayStatusEmoji,
  dayStatusLabel,
} from "@/lib/weekly-stats";
import { ROUTINE_LABELS } from "@/lib/constants";
import { formatWeekRange, weekdayShort } from "@/lib/week";
import { createClient } from "@/lib/supabase/server";

export default async function AdminMemberPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;
  const supabase = createClient();
  const member = await fetchMemberDetail(supabase, id);

  if (!member) notFound();

  const { weekReport } = member;
  const days = weekReport.days;

  return (
    <>
      <div className="mb-4">
        <Link
          href="/admin/people"
          className="text-sm font-medium text-indigo-600 dark:text-indigo-400"
        >
          ← People
        </Link>
      </div>

      <header className="mb-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-[var(--foreground)]">
              {member.displayName}
            </h1>
            <p className="mt-1 text-sm text-[var(--muted)]">{member.email}</p>
          </div>
          <CommitmentBadge tier={member.tier} />
        </div>
        <div className="mt-3 flex flex-wrap gap-2 text-xs text-[var(--muted)]">
          <span>{member.phoneNumber}</span>
          {member.role === "admin" && (
            <span className="rounded bg-indigo-100 px-1.5 py-0.5 font-medium text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300">
              Admin
            </span>
          )}
          <span>{member.hasPush ? "🔔 Push on" : "🔕 No push"}</span>
          {!member.onboardingComplete && (
            <span className="text-amber-600">Onboarding incomplete</span>
          )}
        </div>
      </header>

      <div className="mb-4 grid grid-cols-3 gap-2">
        <Card className="p-3 text-center">
          <p className="text-xl font-bold">{member.logRatePercent}%</p>
          <p className="text-[10px] uppercase text-[var(--muted)]">7d logged</p>
        </Card>
        <Card className="p-3 text-center">
          <p className="text-xl font-bold">{member.maxStreak}</p>
          <p className="text-[10px] uppercase text-[var(--muted)]">Streak</p>
        </Card>
        <Card className="p-3 text-center">
          <p className="text-xl font-bold">{member.completeCount}</p>
          <p className="text-[10px] uppercase text-[var(--muted)]">Full wins</p>
        </Card>
      </div>

      {member.reminderActionRate !== null && (
        <Card className="mb-4 p-4 text-sm text-[var(--muted)]">
          Reminder response rate (7d):{" "}
          <span className="font-semibold text-[var(--foreground)]">
            {member.reminderActionRate}%
          </span>
        </Card>
      )}

      <p className="mb-3 text-sm text-[var(--muted)]">
        {formatWeekRange(days[0], days[days.length - 1], member.timezone)}
      </p>

      <div className="space-y-4">
        {weekReport.routines.map((routine) => (
          <Card key={routine.routineId} className="space-y-4 p-5">
            <div>
              <h2 className="text-lg font-semibold text-[var(--foreground)]">
                {ROUTINE_LABELS[routine.routineType]}
              </h2>
              <p className="mt-1 text-sm text-[var(--muted)]">
                {routine.loggedCount}/7 logged · {routine.completeCount}{" "}
                complete · 🔥 {routine.streak} streak
              </p>
            </div>
            <div className="grid grid-cols-7 gap-1.5">
              {routine.days.map((day) => (
                <div key={day.date} className="flex flex-col items-center gap-1">
                  <span className="text-[10px] font-medium text-[var(--muted)]">
                    {weekdayShort(day.date, member.timezone)}
                  </span>
                  <div
                    title={`${day.date}: ${dayStatusLabel(day.status)}`}
                    className={`flex h-10 w-full items-center justify-center rounded-xl text-sm ${
                      day.status === "complete"
                        ? "bg-emerald-100 dark:bg-emerald-900/30"
                        : day.status === "partial"
                          ? "bg-amber-100 dark:bg-amber-900/30"
                          : day.status === "missed"
                            ? "bg-red-100 dark:bg-red-900/30"
                            : "bg-stone-100 dark:bg-stone-800"
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

      {member.recentMissReasons.length > 0 && (
        <Card className="mt-4 space-y-3 p-5">
          <h2 className="font-semibold text-[var(--foreground)]">
            Recent miss reasons
          </h2>
          <ul className="space-y-2">
            {member.recentMissReasons.map((item, i) => (
              <li
                key={`${item.date}-${item.reason}-${i}`}
                className="rounded-xl bg-stone-50 px-3 py-2 text-sm dark:bg-stone-800/50"
              >
                <p className="text-[var(--foreground)]">{item.reason}</p>
                <p className="mt-0.5 text-xs text-[var(--muted)]">
                  {item.itemLabel} · {item.date}
                </p>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <div className="mt-6">
        <a
          href={whatsappUrl(member.phoneNumber)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-emerald-600 px-4 text-base font-semibold text-white hover:bg-emerald-700"
        >
          Message on WhatsApp
        </a>
      </div>

      <div className="mt-3">
        <ButtonLink href="/admin/people" variant="secondary" className="w-full">
          Back to people
        </ButtonLink>
      </div>
    </>
  );
}
