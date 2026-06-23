"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { isPushSupported, syncPushSubscription } from "@/lib/push/client";
import { savePushSubscription } from "@/lib/push/save-subscription";

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

      await syncPushSubscription(user.id, async (sub) =>
        savePushSubscription(supabase, {
          user_id: sub.user_id,
          subscription_json: sub.subscription_json,
          endpoint: sub.endpoint,
        })
      );
    })();
  }, []);

  return null;
}
