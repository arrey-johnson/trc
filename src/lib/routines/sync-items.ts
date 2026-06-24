import type { SupabaseClient } from "@supabase/supabase-js";
import type { RoutineItemDraft } from "@/components/RoutineBuilder";

export async function syncRoutineItems(
  supabase: SupabaseClient,
  routineId: string,
  items: RoutineItemDraft[]
): Promise<{ error: string | null }> {
  const activeItems = items.filter((item) => item.label.trim());
  if (activeItems.length === 0) {
    return { error: "Add at least one habit." };
  }

  const { data: existing, error: existingError } = await supabase
    .from("routine_items")
    .select("id")
    .eq("routine_id", routineId);

  if (existingError) {
    return { error: existingError.message };
  }

  const existingIds = new Set((existing ?? []).map((row) => row.id));
  const keptIds = new Set(
    activeItems
      .filter((item) => existingIds.has(item.id))
      .map((item) => item.id)
  );

  for (const row of existing ?? []) {
    if (keptIds.has(row.id)) continue;

    const { count, error: countError } = await supabase
      .from("checkin_items")
      .select("id", { count: "exact", head: true })
      .eq("routine_item_id", row.id);

    if (countError) {
      return { error: countError.message };
    }

    if ((count ?? 0) > 0) {
      const { error } = await supabase
        .from("routine_items")
        .update({ is_active: false })
        .eq("id", row.id);
      if (error) return { error: error.message };
    } else {
      const { error } = await supabase
        .from("routine_items")
        .delete()
        .eq("id", row.id);
      if (error) return { error: error.message };
    }
  }

  for (let index = 0; index < activeItems.length; index++) {
    const item = activeItems[index];
    const payload = {
      routine_id: routineId,
      label: item.label.trim(),
      sort_order: index,
      is_active: true,
    };

    if (existingIds.has(item.id)) {
      const { error } = await supabase
        .from("routine_items")
        .update(payload)
        .eq("id", item.id);
      if (error) return { error: error.message };
    } else {
      const { error } = await supabase.from("routine_items").insert({
        id: item.id,
        ...payload,
      });
      if (error) return { error: error.message };
    }
  }

  return { error: null };
}
