import { RoutineEditor } from "@/components/RoutineEditor";
import { requireMember } from "@/lib/auth";
import { loadRoutineEditorData } from "@/lib/routines/load-routines";
import type { RoutineType } from "@/lib/types";

interface RoutinesPageProps {
  searchParams: { tab?: string };
}

export default async function RoutinesPage({ searchParams }: RoutinesPageProps) {
  const profile = await requireMember();
  const initialData = await loadRoutineEditorData(profile.id);

  const initialTab: RoutineType =
    searchParams.tab === "evening" ? "evening" : "morning";

  return <RoutineEditor initialTab={initialTab} initialData={initialData} />;
}
