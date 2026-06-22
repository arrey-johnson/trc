import { NotificationsList } from "@/components/NotificationsList";
import { ButtonLink, PageShell } from "@/components/ui";
import { getAuthUser, getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function NotificationsPage() {
  const authUser = await getAuthUser();
  if (!authUser) redirect("/auth/login");

  const profile = await getCurrentUser();
  if (!profile?.onboarding_complete) redirect("/onboarding");

  const supabase = createClient();
  const { data: notifications } = await supabase
    .from("app_notifications")
    .select("*")
    .eq("user_id", profile.id)
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <PageShell
      title="Notifications"
      subtitle="Reminders, forum posts, and updates"
      action={
        <ButtonLink href="/settings" variant="ghost" className="w-auto px-3 text-sm">
          Settings
        </ButtonLink>
      }
    >
      <NotificationsList
        initial={notifications ?? []}
        userId={profile.id}
      />
    </PageShell>
  );
}
