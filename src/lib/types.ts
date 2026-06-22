export type RoutineType = "morning" | "evening";
export type CheckinStatus = "complete" | "partial" | "missed";
export type WhatsappGroupRole = "member" | "admin";

export interface User {
  id: string;
  phone_number: string;
  email: string;
  display_name: string;
  whatsapp_group_role: WhatsappGroupRole;
  timezone: string;
  morning_reminder_time: string;
  evening_reminder_time: string;
  onboarding_complete: boolean;
  created_at: string;
}

export interface Routine {
  id: string;
  user_id: string;
  type: RoutineType;
  is_active: boolean;
  name: string;
}

export interface RoutineItem {
  id: string;
  routine_id: string;
  label: string;
  sort_order: number;
  is_active: boolean;
}

export interface Checkin {
  id: string;
  user_id: string;
  routine_id: string;
  date: string;
  status: CheckinStatus;
  submitted_at: string;
}

export interface CheckinItem {
  id: string;
  checkin_id: string;
  routine_item_id: string;
  was_done: boolean;
  reason_if_not_done: string | null;
}

export interface CheckinItemAnswer {
  routineItemId: string;
  label: string;
  wasDone: boolean | null;
  reasonIfNotDone: string;
}

export interface ReportItem {
  label: string;
  wasDone: boolean;
  reason?: string;
}

export interface ForumPost {
  id: string;
  author_id: string;
  title: string;
  body: string;
  category: string;
  is_published: boolean;
  created_at: string;
  updated_at: string;
  notified_at?: string | null;
}

export interface ForumPostWithAuthor extends ForumPost {
  author: {
    display_name: string;
  } | null;
}
