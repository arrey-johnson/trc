export type RoutineType = "morning" | "evening";
export type CheckinStatus = "complete" | "partial" | "missed";
export type WhatsappGroupRole = "member" | "admin";

export interface User {
  id: string;
  phone_number: string;
  email: string;
  display_name: string;
  avatar_url: string | null;
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

export interface DailyNonNegotiable {
  id: string;
  user_id: string;
  date: string;
  label: string;
  target_time: string;
  is_completed: boolean;
  completed_at: string | null;
  sort_order: number;
  created_at: string;
}

export interface DailyNonNegotiableReview {
  id: string;
  user_id: string;
  date: string;
  completed_all: boolean;
  reflection: string | null;
  submitted_at: string;
}

export interface ForumPost {
  id: string;
  author_id: string;
  title: string | null;
  body: string;
  category: string;
  parent_id: string | null;
  like_count: number;
  reply_count: number;
  is_published: boolean;
  created_at: string;
  updated_at: string;
  notified_at?: string | null;
}

export interface ForumPostWithAuthor extends ForumPost {
  author: {
    display_name: string;
    avatar_url?: string | null;
  } | null;
  liked_by_me?: boolean;
}

export interface Book {
  id: string;
  title: string;
  author: string;
  description: string;
  storage_path: string;
  page_count: number;
  is_active: boolean;
  created_by: string;
  created_at: string;
}

export interface BookAssignment {
  id: string;
  book_id: string;
  user_id: string;
  assigned_by: string;
  assigned_at: string;
}

export interface BookReadingProgress {
  id: string;
  book_id: string;
  user_id: string;
  current_page: number;
  last_read_at: string;
}

export interface BookWithProgress extends Book {
  progress: BookReadingProgress | null;
  pages_read_today?: number;
}
