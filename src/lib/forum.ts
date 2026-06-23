export const FORUM_MAX_CHARS = 280;

export const FORUM_CATEGORIES = [
  "book_lesson",
  "personal_development",
  "mindset",
  "habits",
  "faith",
] as const;

export type ForumCategory = (typeof FORUM_CATEGORIES)[number];

const CATEGORY_LABELS: Record<string, string> = {
  book_lesson: "Book lesson",
  personal_development: "Personal development",
  mindset: "Mindset",
  habits: "Habits",
  faith: "Faith & purpose",
};

export function forumCategoryLabel(category: string): string {
  return CATEGORY_LABELS[category] ?? category.replace(/_/g, " ");
}

export function formatPostDate(iso: string, timezone = "Africa/Douala"): string {
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d`;

  return new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    month: "short",
    day: "numeric",
  }).format(date);
}

export function validatePostBody(body: string): string | null {
  const trimmed = body.trim();
  if (!trimmed) return "Write something to post.";
  if (trimmed.length > FORUM_MAX_CHARS) {
    return `Posts are limited to ${FORUM_MAX_CHARS} characters.`;
  }
  return null;
}

export function isForumCategory(value: string): value is ForumCategory {
  return (FORUM_CATEGORIES as readonly string[]).includes(value);
}
