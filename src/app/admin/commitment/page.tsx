import Link from "next/link";
import { CommitmentBadge } from "@/components/admin/CommitmentBadge";
import { Card } from "@/components/ui";
import { requireAdmin } from "@/lib/auth";
import { fetchAdminDashboard } from "@/lib/admin/data";
import {
  TIER_LABELS,
  slotEmoji,
  type CommitmentTier,
} from "@/lib/admin/commitment";
import { createClient } from "@/lib/supabase/server";

export default async function AdminCommitmentPage() {
  await requireAdmin();
  const supabase = createClient();
  const data = await fetchAdminDashboard(supabase);

  const activeMembers = data.members.filter((m) => m.onboardingComplete);
  const dates = data.trendDays.map((d) => d.date);

  return (
    <>
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-[var(--foreground)]">
          Commitment
        </h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Group accountability over the last 7 days
        </p>
      </header>

      <Card className="mb-4 space-y-3 p-4">
        <h2 className="font-semibold text-[var(--foreground)]">Tier breakdown</h2>
        <div className="space-y-2">
          {(Object.keys(TIER_LABELS) as CommitmentTier[]).map((tier) => {
            const count = data.tierCounts[tier];
            const pct =
              data.totalMembers > 0
                ? Math.round((count / data.totalMembers) * 100)
                : 0;
            return (
              <div key={tier} className="flex items-center gap-3">
                <CommitmentBadge tier={tier} />
                <div className="flex-1">
                  <div className="h-2 overflow-hidden rounded-full bg-stone-100 dark:bg-stone-800">
                    <div
                      className="h-full rounded-full bg-indigo-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
                <span className="text-sm font-medium text-[var(--muted)]">
                  {count}
                </span>
              </div>
            );
          })}
        </div>
      </Card>

      <Card className="mb-4 overflow-x-auto p-4">
        <h2 className="mb-3 font-semibold text-[var(--foreground)]">
          7-day heatmap
        </h2>
        <table className="w-full min-w-[320px] text-xs">
          <thead>
            <tr>
              <th className="pb-2 text-left font-medium text-[var(--muted)]">
                Member
              </th>
              {dates.map((d) => (
                <th
                  key={d}
                  className="pb-2 text-center font-medium text-[var(--muted)]"
                >
                  {d.slice(8)}
                </th>
              ))}
              <th className="pb-2 text-right font-medium text-[var(--muted)]">
                7d
              </th>
            </tr>
          </thead>
          <tbody>
            {activeMembers.map((member) => (
              <tr key={member.userId} className="border-t border-[var(--border)]">
                <td className="py-2 pr-2">
                  <Link
                    href={`/admin/people/${member.userId}`}
                    className="font-medium text-[var(--foreground)] hover:text-indigo-600"
                  >
                    {member.displayName.split(" ")[0]}
                  </Link>
                </td>
                {dates.map((d) => {
                  const logged = member.weekLoggedDates.includes(d);
                  return (
                    <td key={d} className="py-2 text-center">
                      {logged ? (
                        <span className="text-emerald-600" title={d}>
                          ●
                        </span>
                      ) : (
                        <span className="text-stone-300 dark:text-stone-600">
                          ·
                        </span>
                      )}
                    </td>
                  );
                })}
                <td className="py-2 text-right font-semibold">
                  {member.logRatePercent}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-2 text-[10px] text-[var(--muted)]">
          For per-routine detail, open a member profile.
        </p>
      </Card>

      <Card className="mb-4 space-y-3 p-4">
        <h2 className="font-semibold text-[var(--foreground)]">
          Today&apos;s slots
        </h2>
        <ul className="space-y-2">
          {activeMembers.map((m) => (
            <li
              key={m.userId}
              className="flex items-center justify-between text-sm"
            >
              <Link
                href={`/admin/people/${m.userId}`}
                className="font-medium hover:text-indigo-600"
              >
                {m.displayName}
              </Link>
              <span className="text-[var(--muted)]">
                ☀️ {slotEmoji(m.todayMorning)} 🌙 {slotEmoji(m.todayEvening)}
              </span>
            </li>
          ))}
        </ul>
      </Card>

      {data.topGroupMissReasons.length > 0 && (
        <Card className="space-y-3 p-4">
          <h2 className="font-semibold text-[var(--foreground)]">
            Group miss reasons
          </h2>
          <ul className="space-y-2">
            {data.topGroupMissReasons.map((item) => (
              <li
                key={item.reason}
                className="flex justify-between rounded-xl bg-stone-50 px-3 py-2 text-sm dark:bg-stone-800/50"
              >
                <span>{item.reason}</span>
                <span className="font-medium text-[var(--muted)]">
                  ×{item.count}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </>
  );
}
