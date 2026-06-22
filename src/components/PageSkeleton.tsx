import { PageShell } from "@/components/ui";

export function PageSkeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div className="animate-pulse space-y-3">
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="h-4 rounded-lg bg-stone-200" />
      ))}
    </div>
  );
}

export function HomePageSkeleton() {
  return (
    <PageShell>
      <div className="mb-6 h-36 animate-pulse rounded-2xl bg-stone-200" />
      <div className="space-y-4">
        <div className="h-40 animate-pulse rounded-2xl border border-stone-200 bg-stone-100 p-5" />
        <div className="h-40 animate-pulse rounded-2xl border border-stone-200 bg-stone-100 p-5" />
      </div>
    </PageShell>
  );
}

export function ForumPageSkeleton() {
  return (
    <PageShell title="Forum" subtitle="Loading posts…">
      <div className="space-y-3">
        <div className="h-32 animate-pulse rounded-2xl border border-stone-200 bg-stone-100 p-5" />
        <div className="h-32 animate-pulse rounded-2xl border border-stone-200 bg-stone-100 p-5" />
      </div>
    </PageShell>
  );
}

export function CheckinPageSkeleton() {
  return (
    <PageShell title="Loading…" subtitle="One moment">
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-2xl border border-stone-200 bg-stone-100" />
        ))}
      </div>
    </PageShell>
  );
}
