import { PageShell } from "@/components/ui";

export default function ProgressLoading() {
  return (
    <PageShell title="Weekly progress" subtitle="Loading your week…">
      <div className="mb-6 h-44 animate-pulse rounded-2xl bg-stone-200" />
      <div className="space-y-4">
        <div className="h-48 animate-pulse rounded-2xl border border-stone-200 bg-stone-100" />
        <div className="h-48 animate-pulse rounded-2xl border border-stone-200 bg-stone-100" />
      </div>
    </PageShell>
  );
}
