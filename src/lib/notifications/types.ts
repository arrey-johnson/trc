export type NotificationType =
  | "morning_reminder"
  | "evening_reminder"
  | "escalation"
  | "forum_post"
  | "general";

export interface AppNotification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  body: string;
  url: string | null;
  read_at: string | null;
  created_at: string;
}

export interface PushSubscriptionRow {
  id: string;
  user_id: string;
  subscription_json: PushSubscriptionJSON;
  endpoint: string | null;
  created_at: string;
}

export interface PushSubscriptionJSON {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  expirationTime?: number | null;
}

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
  tag?: string;
}

export interface ReminderLogRow {
  id: string;
  user_id: string;
  date: string;
  reminder_type: "first" | "escalation";
  routine_type: "morning" | "evening";
  sent_at: string;
  was_actioned: boolean;
}
