import type { SupabaseClient } from "@supabase/supabase-js";
import type { PushSubscriptionJSON } from "@/lib/notifications/types";

export async function savePushSubscription(
  supabase: SupabaseClient,
  row: {
    user_id: string;
    subscription_json: PushSubscriptionJSON;
    endpoint: string;
  }
): Promise<{ error: Error | null }> {
  const { error } = await supabase.from("push_subscriptions").upsert(
    row,
    { onConflict: "user_id,endpoint" }
  );

  if (!error) {
    return { error: null };
  }

  if (!error.message.includes("ON CONFLICT")) {
    return { error: new Error(error.message) };
  }

  const { error: deleteError } = await supabase
    .from("push_subscriptions")
    .delete()
    .eq("user_id", row.user_id)
    .eq("endpoint", row.endpoint);

  if (deleteError) {
    return { error: new Error(deleteError.message) };
  }

  const { error: insertError } = await supabase
    .from("push_subscriptions")
    .insert(row);

  return { error: insertError ? new Error(insertError.message) : null };
}
