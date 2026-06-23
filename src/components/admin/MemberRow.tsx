import Link from "next/link";
import { CommitmentBadge } from "@/components/admin/CommitmentBadge";
import { Card } from "@/components/ui";
import { slotEmoji, whatsappUrl, type MemberStats } from "@/lib/admin/commitment";

export function MemberRow({
  member,
  showToday = true,
}: {
  member: MemberStats;
  showToday?: boolean;
}) {
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <Link
            href={`/admin/people/${member.userId}`}
            className="font-semibold text-[var(--foreground)] hover:text-indigo-600"
          >
            {member.displayName}
          </Link>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <CommitmentBadge tier={member.tier} />
            {member.role === "admin" && (
              <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300">
                Admin
              </span>
            )}
          </div>
          <p className="mt-1.5 text-xs text-[var(--muted)]">
            7d: {member.logRatePercent}% logged · 🔥 {member.maxStreak} streak
            {member.lastCheckinDate
              ? ` · last ${member.lastCheckinDate}`
              : " · no check-ins yet"}
          </p>
          {showToday && (
            <p className="mt-1 text-xs text-[var(--muted)]">
              Today: ☀️ {slotEmoji(member.todayMorning)} · 🌙{" "}
              {slotEmoji(member.todayEvening)}
            </p>
          )}
        </div>
        <a
          href={whatsappUrl(member.phoneNumber)}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700"
          aria-label={`WhatsApp ${member.displayName}`}
        >
          WA
        </a>
      </div>
    </Card>
  );
}
