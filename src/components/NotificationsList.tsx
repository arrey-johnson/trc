"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, Card } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";
import type { AppNotification } from "@/lib/notifications/types";

function formatWhen(iso: string) {
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function typeLabel(type: AppNotification["type"]) {
  switch (type) {
    case "morning_reminder":
      return "Morning reminder";
    case "evening_reminder":
      return "Evening reminder";
    case "escalation":
      return "Follow-up";
    case "forum_post":
      return "Forum";
    default:
      return "Update";
  }
}

export function NotificationsList({
  initial,
  userId,
}: {
  initial: AppNotification[];
  userId: string;
}) {
  const [items, setItems] = useState(initial);
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const unread = items.filter((n) => !n.read_at).length;

  async function markRead(id: string, url: string | null) {
    const readAt = new Date().toISOString();
    setItems((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read_at: readAt } : n))
    );

    await supabase
      .from("app_notifications")
      .update({ read_at: readAt })
      .eq("id", id)
      .eq("user_id", userId);

    if (url) router.push(url);
  }

  async function markAllRead() {
    setBusy(true);
    const readAt = new Date().toISOString();
    setItems((prev) => prev.map((n) => ({ ...n, read_at: readAt })));

    await supabase
      .from("app_notifications")
      .update({ read_at: readAt })
      .eq("user_id", userId)
      .is("read_at", null);

    setBusy(false);
  }

  if (items.length === 0) {
    return (
      <Card className="p-6 text-center">
        <p className="text-[var(--muted)]">No notifications yet.</p>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Reminders and forum posts will show up here.
        </p>
        <Link
          href="/settings"
          className="mt-4 inline-block text-sm font-medium text-emerald-700"
        >
          Notification settings →
        </Link>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {unread > 0 && (
        <div className="flex justify-end">
          <Button
            type="button"
            variant="ghost"
            className="w-auto px-3 text-sm"
            onClick={markAllRead}
            disabled={busy}
          >
            Mark all read
          </Button>
        </div>
      )}

      <ul className="space-y-2">
        {items.map((n) => (
          <li key={n.id}>
            <button
              type="button"
              onClick={() => markRead(n.id, n.url)}
              className={`w-full rounded-2xl border p-4 text-left transition active:scale-[0.99] ${
                n.read_at
                  ? "border-[var(--border)] bg-[var(--card)]"
                  : "border-emerald-200 bg-emerald-50/50 dark:border-emerald-800 dark:bg-emerald-950/40"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <span className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
                  {typeLabel(n.type)}
                </span>
                <span className="shrink-0 text-xs text-[var(--muted)]">
                  {formatWhen(n.created_at)}
                </span>
              </div>
              <p className="mt-1 font-semibold text-[var(--foreground)]">{n.title}</p>
              <p className="mt-1 text-sm text-[var(--muted)] line-clamp-2">
                {n.body}
              </p>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
