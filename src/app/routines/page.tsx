import { RoutineEditor } from "@/components/RoutineEditor";
import { getAuthUser, getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function RoutinesPage() {
  const authUser = await getAuthUser();
  if (!authUser) redirect("/auth/login");

  const profile = await getCurrentUser();
  if (!profile?.onboarding_complete) redirect("/onboarding");

  return <RoutineEditor />;
}
