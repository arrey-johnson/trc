import { SettingsForm } from "@/app/settings/SettingsForm";
import { getAuthUser, getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function SettingsPage() {
  const authUser = await getAuthUser();
  if (!authUser) redirect("/auth/login");

  const profile = await getCurrentUser();
  if (!profile?.onboarding_complete) redirect("/onboarding");

  return <SettingsForm profile={profile} />;
}
