import CheckinPage from "@/components/CheckinPage";
import { requireMember } from "@/lib/auth";
import { loadCheckinPageData } from "@/lib/checkin/load-checkin";

export const dynamic = "force-dynamic";

export default async function EveningCheckinPage() {
  const profile = await requireMember();
  const data = await loadCheckinPageData(
    profile.id,
    "evening",
    profile.timezone ?? "Africa/Douala",
    profile.evening_reminder_time
  );

  return <CheckinPage routineType="evening" initialData={data} />;
}
