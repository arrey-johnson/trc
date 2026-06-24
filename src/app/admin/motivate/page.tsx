import { AdminMotivationalQuoteForm } from "@/components/admin/AdminMotivationalQuoteForm";
import { AdminTestNotificationsButton } from "@/components/admin/AdminTestNotificationsButton";
import { Card } from "@/components/ui";
import { requireAdmin } from "@/lib/auth";

export default async function AdminMotivatePage() {
  await requireAdmin();

  return (
    <>
      <header className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-[var(--foreground)]">
          Motivate
        </h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Send a short quote as a push notification to the whole circle.
        </p>
      </header>

      <Card className="mb-4 space-y-3 p-5">
        <h2 className="font-semibold text-[var(--foreground)]">
          Motivational quote
        </h2>
        <p className="text-sm text-[var(--muted)]">
          Everyone gets it in their notification inbox. Members with push
          enabled also receive it on their phone, even when the app is closed.
        </p>
        <AdminMotivationalQuoteForm />
      </Card>

      <Card className="space-y-3 p-5">
        <h2 className="font-semibold text-[var(--foreground)]">Test push</h2>
        <p className="text-sm text-[var(--muted)]">
          Verify delivery with a quick test message before sending a quote.
        </p>
        <AdminTestNotificationsButton />
      </Card>
    </>
  );
}
