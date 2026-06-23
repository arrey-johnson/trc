import { MemberRow } from "@/components/admin/MemberRow";
import { CommitmentBadge } from "@/components/admin/CommitmentBadge";
import { Card } from "@/components/ui";
import { requireAdmin } from "@/lib/auth";
import { fetchAdminDashboard } from "@/lib/admin/data";
import { TIER_LABELS, type CommitmentTier } from "@/lib/admin/commitment";
import { createClient } from "@/lib/supabase/server";

const TIER_ORDER: CommitmentTier[] = [
  "at_risk",
  "inactive",
  "slipping",
  "steady",
  "strong",
];

export default async function AdminOverviewPage() {
  await requireAdmin();
  const supabase = createClient();
  const data = await fetchAdminDashboard(supabase);

  const needsAttention = data.members
    .filter(
      (m) =>
        m.tier === "at_risk" ||
        m.tier === "inactive" ||
        (m.onboardingComplete &&
          (m.todayMorning === "none" || m.todayEvening === "none"))
    )
    .sort((a, b) => {
      const tierRank = (t: CommitmentTier) => TIER_ORDER.indexOf(t);
      return tierRank(a.tier) - tierRank(b.tier);
    });

  return (
    <>
      <header className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-[var(--foreground)]">
          Overview
        </h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Group health at a glance
        </p>
      </header>

      <div className="mb-4 grid grid-cols-2 gap-2">
        <Card className="p-3 text-center">
          <p className="text-2xl font-bold text-[var(--foreground)]">
            {data.onboardedCount}
          </p>
          <p className="text-[10px] uppercase tracking-wide text-[var(--muted)]">
            Onboarded
          </p>
        </Card>
        <Card className="p-3 text-center">
          <p className="text-2xl font-bold text-[var(--foreground)]">
            {data.groupLogRate7d}%
          </p>
          <p className="text-[10px] uppercase tracking-wide text-[var(--muted)]">
            7-day log rate
          </p>
        </Card>
        <Card className="p-3 text-center">
          <p className="text-2xl font-bold text-[var(--foreground)]">
            {data.todayMorningDone}/{data.onboardedCount}
          </p>
          <p className="text-[10px] uppercase tracking-wide text-[var(--muted)]">
            Morning logged
          </p>
        </Card>
        <Card className="p-3 text-center">
          <p className="text-2xl font-bold text-[var(--foreground)]">
            {data.todayEveningDone}/{data.onboardedCount}
          </p>
          <p className="text-[10px] uppercase tracking-wide text-[var(--muted)]">
            Evening logged
          </p>
        </Card>
      </div>

      <Card className="mb-4 space-y-3 p-4">
        <h2 className="font-semibold text-[var(--foreground)]">
          Commitment tiers
        </h2>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(TIER_LABELS) as CommitmentTier[]).map((tier) => (
            <div key={tier} className="flex items-center gap-1.5">
              <CommitmentBadge tier={tier} />
              <span className="text-sm font-medium text-[var(--muted)]">
                {data.tierCounts[tier]}
              </span>
            </div>
          ))}
        </div>
      </Card>

      <Card className="mb-4 space-y-2 p-4">
        <h2 className="font-semibold text-[var(--foreground)]">
          7-day group trend
        </h2>
        <div className="flex items-end gap-1.5">
          {data.trendDays.map((day) => (
            <div
              key={day.date}
              className="flex flex-1 flex-col items-center gap-1"
            >
              <div
                className="w-full rounded-t-md bg-indigo-500/80"
                style={{
                  height: `${Math.max(4, (day.logRate / 100) * 48)}px`,
                }}
                title={`${day.date}: ${day.logRate}%`}
              />
              <span className="text-[9px] text-[var(--muted)]">
                {day.date.slice(8)}
              </span>
            </div>
          ))}
        </div>
      </Card>

      {data.topGroupMissReasons.length > 0 && (
        <Card className="mb-4 space-y-2 p-4">
          <h2 className="font-semibold text-[var(--foreground)]">
            Top miss reasons (7d)
          </h2>
          <ul className="space-y-1.5">
            {data.topGroupMissReasons.map((item) => (
              <li
                key={item.reason}
                className="flex justify-between text-sm text-[var(--muted)]"
              >
                <span className="truncate pr-2">{item.reason}</span>
                <span className="shrink-0 font-medium">×{item.count}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <section className="space-y-3">
        <h2 className="font-semibold text-[var(--foreground)]">
          Needs attention ({needsAttention.length})
        </h2>
        {needsAttention.length === 0 ? (
          <Card className="p-4 text-center text-sm text-[var(--muted)]">
            Everyone is on track today 🎉
          </Card>
        ) : (
          needsAttention.map((member) => (
            <MemberRow key={member.userId} member={member} />
          ))
        )}
      </section>
    </>
  );
}
