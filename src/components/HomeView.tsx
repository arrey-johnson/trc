"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { DailyNonNegotiablesCard } from "@/components/DailyNonNegotiablesCard";
import { NotificationBell } from "@/components/NotificationBell";
import { UserAvatar } from "@/components/profile/UserAvatar";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button, ButtonLink, Card, PageShell } from "@/components/ui";
import { ROUTINE_LABELS } from "@/lib/constants";
import type { CheckinStatus, DailyNonNegotiable, RoutineType } from "@/lib/types";

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

export interface HomeViewProps {
  displayName: string;
  avatarUrl: string | null;
  friendlyDate: string;
  today: string;
  timezone: string;
  userId: string;
  nnItems: DailyNonNegotiable[];
  loggedCount: number;
  isEvening: boolean;
  eveningUnlockLabel: string;
  unreadCount: number;
  routines: {
    type: RoutineType;
    checkin: { id: string; status: CheckinStatus } | null;
  }[];
}

function TodayProgressBar({
  nnCompleted,
  nnTotal,
  loggedCount,
  routineCount,
}: {
  nnCompleted: number;
  nnTotal: number;
  loggedCount: number;
  routineCount: number;
}) {
  const progressDone = nnCompleted + loggedCount;
  const progressTotal = nnTotal + routineCount;
  const progressLabel =
    nnTotal > 0
      ? `${nnCompleted}/${nnTotal} non-negotiables · ${loggedCount}/${routineCount} routines`
      : `${loggedCount}/${routineCount} routines logged`;

  return (
    <div className="mt-4">
      <div className="mb-1 flex items-center justify-between text-xs font-medium text-white/80">
        <span>Today&apos;s progress</span>
        <span>{progressLabel}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-black/25">
        <div
          className="h-full rounded-full bg-white transition-[width] duration-200 ease-out"
          style={{
            width: `${progressTotal > 0 ? (progressDone / progressTotal) * 100 : 0}%`,
          }}
        />
      </div>
    </div>
  );
}

export function HomeView({
  displayName,
  avatarUrl,
  friendlyDate,
  today,
  timezone,
  userId,
  nnItems,
  loggedCount,
  isEvening,
  eveningUnlockLabel,
  unreadCount,
  routines,
}: HomeViewProps) {
  const [nnCompleted, setNnCompleted] = useState(
    () => nnItems.filter((i) => i.is_completed).length
  );
  const [nnTotal, setNnTotal] = useState(() => nnItems.length);

  useEffect(() => {
    setNnCompleted(nnItems.filter((i) => i.is_completed).length);
    setNnTotal(nnItems.length);
  }, [nnItems]);

  const onProgressChange = useCallback((completed: number, total: number) => {
    setNnCompleted(completed);
    setNnTotal(total);
  }, []);

  const routineCount = routines.length;

  return (
    <PageShell>
      <header className="mb-6 rounded-2xl bg-brand-gradient p-5 text-white shadow-md">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-white/80">Today</p>
            <h1 className="mt-1 text-2xl font-bold">Hey, {displayName}</h1>
            <p className="mt-1 text-sm text-white/90">{friendlyDate}</p>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <UserAvatar
              name={displayName}
              avatarUrl={avatarUrl}
              size="md"
              className="mr-1 ring-2 ring-white/30"
            />
            <ThemeToggle variant="header" />
            <NotificationBell initialUnread={unreadCount} />
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

        <TodayProgressBar
          nnCompleted={nnCompleted}
          nnTotal={nnTotal}
          loggedCount={loggedCount}
          routineCount={routineCount}
        />
      </header>

      <div className="space-y-4">
        <DailyNonNegotiablesCard
          items={nnItems}
          timezone={timezone}
          today={today}
          userId={userId}
          onProgressChange={onProgressChange}
        />

        {routines.map(({ type, checkin }) => {
          const label = ROUTINE_LABELS[type];
          const meta = ROUTINE_META[type];
          const isDone = Boolean(checkin);
          const isEveningLocked = type === "evening" && !isEvening && !isDone;

          return (
            <Card key={type} className="space-y-4 p-5">
              <div className="flex items-start gap-3">
                <span
                  className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-2xl ${
                    type === "morning"
                      ? "bg-[var(--accent-morning-subtle)]"
                      : "bg-[var(--accent-evening-subtle)]"
                  }`}
                  aria-hidden
                >
                  {meta.emoji}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-lg font-semibold text-[var(--foreground)]">
                        {label}
                      </h2>
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          isDone
                            ? "bg-brand-subtle text-brand-subtle-fg dark:bg-brand-subtle dark:text-brand-muted"
                            : isEveningLocked
                              ? "bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-300"
                              : type === "morning"
                                ? "bg-[var(--accent-morning-subtle)] text-[var(--accent-morning-fg)]"
                                : "bg-[var(--accent-evening-subtle)] text-[var(--accent-evening-fg)]"
                        }`}
                      >
                        {isDone
                          ? statusLabel(checkin!.status)
                          : isEveningLocked
                            ? `Opens ${eveningUnlockLabel}`
                            : "Pending"}
                      </span>
                    </div>
                    <Link
                      href={`/routines?tab=${type}`}
                      className="shrink-0 text-sm font-medium text-brand-subtle-fg hover:underline dark:text-brand-muted"
                    >
                      Edit routine
                    </Link>
                  </div>
                  <p className="mt-1 text-sm text-[var(--muted)]">
                    {isDone
                      ? "Submitted — tap below to share with your group"
                      : isEveningLocked
                        ? `Evening check-in unlocks at ${eveningUnlockLabel}`
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
              ) : isEveningLocked ? (
                <Button className="w-full" disabled>
                  {meta.logLabel}
                </Button>
              ) : (
                <ButtonLink href={`/checkin/${type}`} className="w-full">
                  {meta.logLabel}
                </ButtonLink>
              )}
            </Card>
          );
        })}
      </div>
    </PageShell>
  );
}
