"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { isPushSupported, syncPushSubscription } from "@/lib/push/client";

/** Keeps push subscription rows fresh when the user already granted permission. */
export function PushSubscriptionSync() {
  useEffect(() => {
    if (!isPushSupported()) return;

    const supabase = createClient();

    void (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      await syncPushSubscription(user.id, async (sub) => {
        const { error } = await supabase.from("push_subscriptions").upsert(
          {
            user_id: sub.user_id,
            subscription_json: sub.subscription_json,
            endpoint: sub.endpoint,
          },
          { onConflict: "user_id,endpoint" }
        );
        return { error: error ? new Error(error.message) : null };
      });
    })();
  }, []);

  return null;
}
