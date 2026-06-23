import { PeopleDirectory } from "@/components/admin/PeopleDirectory";
import { requireAdmin } from "@/lib/auth";
import { fetchAllMemberStats } from "@/lib/admin/data";
import { createClient } from "@/lib/supabase/server";

export default async function AdminPeoplePage() {
  await requireAdmin();
  const supabase = createClient();
  const members = await fetchAllMemberStats(supabase);

  return <PeopleDirectory members={members} />;
}
