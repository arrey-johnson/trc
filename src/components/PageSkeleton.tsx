"use client";

import { PageShell } from "@/components/ui";

export function PageSkeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div className="animate-pulse space-y-3">
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="h-4 rounded-lg bg-[var(--border)]" />
      ))}
    </div>
  );
}

export function GenericPageSkeleton() {
  return (
    <PageShell>
      <div className="mb-6 h-36 animate-pulse rounded-2xl bg-[var(--border)]" />
      <div className="space-y-4">
        <div className="h-48 animate-pulse rounded-2xl border border-[var(--border)] bg-[var(--card)]" />
        <div className="h-48 animate-pulse rounded-2xl border border-[var(--border)] bg-[var(--card)]" />
      </div>
    </PageShell>
  );
}

export function HomePageSkeleton() {
  return (
    <PageShell>
      <div className="mb-6 h-36 animate-pulse rounded-2xl bg-[var(--border)]" />
      <div className="space-y-4">
        <div className="h-40 animate-pulse rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5" />
        <div className="h-40 animate-pulse rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5" />
      </div>
    </PageShell>
  );
}

export function ForumPageSkeleton() {
  return (
    <PageShell title="Forum" subtitle="Loading posts…">
      <div className="space-y-3">
        <div className="h-32 animate-pulse rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5" />
        <div className="h-32 animate-pulse rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5" />
      </div>
    </PageShell>
  );
}

export function CheckinPageSkeleton({ title = "Loading…" }: { title?: string }) {
  return (
    <PageShell title={title} subtitle="One moment">
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-2xl border border-[var(--border)] bg-[var(--card)]" />
        ))}
      </div>
    </PageShell>
  );
}
