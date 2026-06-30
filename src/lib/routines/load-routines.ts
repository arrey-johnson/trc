import { createClient } from "@/lib/supabase/server";
import type { RoutineEditorData } from "@/lib/routines/types";
import type { RoutineType } from "@/lib/types";

export type { RoutineEditorData, RoutineItemDraft } from "@/lib/routines/types";

export async function loadRoutineEditorData(
  userId: string
): Promise<RoutineEditorData> {
  const supabase = createClient();

  const { data: routines } = await supabase
    .from("routines")
    .select("id, type")
    .eq("user_id", userId)
    .eq("is_active", true);

  const routineIds: Record<RoutineType, string | null> = {
    morning: null,
    evening: null,
  };

  for (const routine of routines ?? []) {
    if (routine.type === "morning") routineIds.morning = routine.id;
    else if (routine.type === "evening") routineIds.evening = routine.id;
  }

  const [morningItems, eveningItems] = await Promise.all(
    (["morning", "evening"] as const).map(async (type) => {
      const routineId = routineIds[type];
      if (!routineId) return [];

      const { data: items } = await supabase
        .from("routine_items")
        .select("id, label")
        .eq("routine_id", routineId)
        .eq("is_active", true)
        .order("sort_order");

      return (items ?? []).map((item) => ({
        id: item.id,
        label: item.label,
      }));
    })
  );

  return { routineIds, morningItems, eveningItems };
}
